import { GoogleGenerativeAI } from '@google/generative-ai';
import Conversation from '../models/Conversation.js';
import Document from '../models/Document.js';

const getModel = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
    ]
  });
};

const MODE_PERSONAS = {
  assistant: {
    name: 'Study Assistant',
    description: 'Helpful assistant for studying documents',
    systemPrompt: 'You are a helpful study assistant. Provide clear, educational responses. Summarize and explain concepts in your own words rather than copying text directly. Be encouraging and supportive.'
  },
  tutor: {
    name: 'Personal Tutor',
    description: 'Patient tutor who explains concepts step by step',
    systemPrompt: 'You are a patient personal tutor. Explain concepts step by step, use examples, and check for understanding. Ask follow-up questions to ensure comprehension. Be encouraging but also challenge the learner.'
  },
  critic: {
    name: 'Critical Reviewer',
    description: 'Analytical critic who evaluates and questions',
    systemPrompt: 'You are a critical reviewer and analyst. Evaluate the document critically, identify weaknesses or gaps, ask probing questions, and provide constructive critique. Be thorough and analytical in your assessment.'
  },
  explainer: {
    name: 'Simple Explainer',
    description: 'Explains everything in simple, easy terms',
    systemPrompt: 'You are a simple explainer who breaks down complex topics into easy-to-understand language. Use analogies, simple examples, and avoid jargon. Make difficult concepts accessible to anyone.'
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId, documentId, mode = 'assistant' } = req.body;
    const userId = req.user._id;
    const persona = MODE_PERSONAS[mode] || MODE_PERSONAS.assistant;

    let conversation;
    let documentContext = '';
    let documentText = '';

    if (documentId) {
      const document = await Document.findById(documentId);
      if (document) {
        documentText = document.extractedText;
        documentContext = `\n\nDocument Content:\n${documentText}\n\n`;
      }
    }

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      conversation.messages.push({ role: 'user', content: message });
    } else {
      conversation = await Conversation.create({
        user: userId,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        document: documentId || null,
        messages: [{ role: 'user', content: message }]
      });
    }

    const chatHistory = conversation.messages
      .slice(-10)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${persona.systemPrompt}\n\n${documentContext}Previous conversation:\n${chatHistory}\n\nUser: ${message}\n\nProvide a helpful, original response based on the document content. Summarize and explain the concepts in your own words rather than copying text directly. If referring to specific information from the document, paraphrase it in your response instead of quoting exact passages.\n\nAfter your response, add 2-3 follow-up questions the user might want to ask next. Format them as: [FOLLOWUP: Question 1 | Question 2 | Question 3]`;

    const model = getModel();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let fullResponse = '';

    try {
      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        res.write(`data: ${JSON.stringify({ token: chunkText })}\n\n`);
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
      if (streamError.message?.includes('RECITATION') || streamError.message?.includes('blocked')) {
        const errorMsg = "I couldn't process that request as the document content may be protected. Could you try asking a more specific question about the document?";
        res.write(`data: ${JSON.stringify({ token: errorMsg })}\n\n`);
        fullResponse = errorMsg;
      } else {
        res.write(`data: ${JSON.stringify({ error: 'An error occurred. Please try again.' })}\n\n`);
        res.end();
        return;
      }
    }

    const cleanedResponse = fullResponse.replace(/\[FOLLOWUP: [^\]]+\]/g, '').trim();
    const followupMatch = fullResponse.match(/\[FOLLOWUP: ([^\]]+)\]/);
    const followUpQuestions = followupMatch ? followupMatch[1].split('|').map(q => q.trim()) : [];

    conversation.messages.push({ role: 'assistant', content: cleanedResponse });
    await conversation.save();

    res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation._id, title: conversation.title, citations: [], followUpQuestions })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
    res.end();
  }
};

export const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const prompt = `Summarize the following document in your own words. Focus on the main points and key takeaways. Format the summary with clear sections:\n\n${document.extractedText.slice(0, 15000)}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary });
  } catch (error) {
    if (error.message?.includes('RECITATION') || error.message?.includes('blocked')) {
      return res.status(400).json({ message: 'Unable to process this document. Please try a different document.' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const explainConcept = async (req, res) => {
  try {
    const { concept } = req.body;

    const prompt = `Explain the following concept to a high school student in simple terms:\n\n${concept}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const explanation = result.response.text();

    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const grammarCheck = async (req, res) => {
  try {
    const { text } = req.body;

    const prompt = `Please check the grammar of the following text and provide corrections if needed:\n\n${text}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const correction = result.response.text();

    res.json({ correction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateNotes = async (req, res) => {
  try {
    const { documentId } = req.body;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const prompt = `Create detailed study notes from this document. Summarize the key concepts and main points in your own words. Use clear headings, bullet points, and organize the information logically:\n\n${document.extractedText.slice(0, 15000)}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const notes = result.response.text();

    res.json({ notes });
  } catch (error) {
    if (error.message?.includes('RECITATION') || error.message?.includes('blocked')) {
      return res.status(400).json({ message: 'Unable to process this document. Please try a different document.' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const translateDocument = async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    const prompt = `Translate the following text to ${targetLang}. Preserve the original formatting and structure:\n\n${text}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const translation = result.response.text();

    res.json({ translation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateQuiz = async (req, res) => {
  try {
    const { documentId, type = 'mixed' } = req.body;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const prompt = `Based on the following document, create a study quiz with 5 questions. Include a mix of question types: multiple choice, true/false, and short answer. Format the output as follows:

# Quiz

## Question 1 (Type: multiple choice)
**Question:** [question text]
**Options:** 
A) [option A]
B) [option B]
C) [option C]
D) [option D]
**Answer:** [correct answer letter]

## Question 2 (Type: true/false)
**Statement:** [statement]
**Answer:** True/False

## Question 3 (Type: short answer)
**Question:** [question text]
**Answer:** [expected answer]

...and so on for 5 questions.

Document content:\n${document.extractedText.slice(0, 15000)}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const quiz = result.response.text();

    res.json({ quiz });
  } catch (error) {
    if (error.message?.includes('RECITATION') || error.message?.includes('blocked')) {
      return res.status(400).json({ message: 'Unable to process this document. Please try a different document.' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const generateFlashcards = async (req, res) => {
  try {
    const { documentId } = req.body;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const prompt = `Based on the following document, create 10 flashcards for studying. Each flashcard should have a front (question/term) and back (answer/definition). Format as:

# Flashcards

## Card 1
**Front:** [term/concept]
**Back:** [definition/explanation]

## Card 2
**Front:** [term/concept]
**Back:** [definition/explanation]

...continue for 10 cards.

Document content:\n${document.extractedText.slice(0, 15000)}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const flashcards = result.response.text();

    res.json({ flashcards });
  } catch (error) {
    if (error.message?.includes('RECITATION') || error.message?.includes('blocked')) {
      return res.status(400).json({ message: 'Unable to process this document. Please try a different document.' });
    }
    res.status(500).json({ message: error.message });
  }
};
