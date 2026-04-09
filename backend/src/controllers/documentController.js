import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import Document from '../models/Document.js';
import Conversation from '../models/Conversation.js';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

const calculateDocumentStats = (text) => {
  if (!text) return { wordCount: 0, pageCount: 1, estimatedReadTime: 1 };
  
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 250));
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));
  
  return { wordCount, pageCount, estimatedReadTime };
};

const getModel = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
    ]
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitError = (error) => {
  return error?.status === 429 || 
    error?.message?.includes('429') ||
    error?.message?.includes('Too Many Requests') ||
    error?.message?.includes('quota');
};

const generateTags = async (text, retries = 3) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const model = getModel();
      const prompt = `Analyze the following document and suggest 3-5 relevant tags/categories. Return only the tags separated by commas. Examples: "Invoice, Financial, 2024", "Contract, Legal, Agreement", "Report, Business, Q4"\n\nDocument content preview:\n${text.slice(0, 2000)}`;
      const result = await model.generateContent(prompt);
      const tags = result.response.text().split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length < 30);
      return tags.slice(0, 5);
    } catch (error) {
      if (isRateLimitError(error) && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Tag generation rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
      } else {
        console.error('Tag generation error:', error);
        return ['Document'];
      }
    }
  }
  return ['Document'];
};

const generateCategory = async (text, retries = 3) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const model = getModel();
      const prompt = `Categorize this document into one of these categories: Report, Contract, Invoice, Form, Article, Manual, Presentation, Other. Return only the category name.\n\nDocument content preview:\n${text.slice(0, 1000)}`;
      const result = await model.generateContent(prompt);
      const category = result.response.text().trim();
      return category.length < 20 ? category : 'Document';
    } catch (error) {
      if (isRateLimitError(error) && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Category generation rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
      } else {
        return 'Document';
      }
    }
  }
  return 'Document';
};

export const uploadMiddleware = upload.single('document');

export const uploadDocument = async (req, res) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    let extractedText = '';

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = await readFile(filePath);
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      extractedText = textResult.text;
    } else if (req.file.mimetype === 'text/plain') {
      extractedText = await readFile(filePath, 'utf-8');
    }

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'nerd-documents',
      resource_type: 'auto'
    });

    const tags = await generateTags(extractedText);
    const category = await generateCategory(extractedText);
    const { wordCount, pageCount, estimatedReadTime } = calculateDocumentStats(extractedText);

    const existingDoc = await Document.findOne({
      user: req.user._id,
      originalName: req.file.originalname
    });

    let document;
    if (existingDoc) {
      const versionNumber = (existingDoc.versions?.length || 0) + 1;
      existingDoc.versions.push({
        versionNumber,
        filename: existingDoc.filename,
        cloudinaryUrl: existingDoc.cloudinaryUrl,
        publicId: existingDoc.publicId,
        extractedText: existingDoc.extractedText,
        uploadedAt: existingDoc.createdAt
      });

      existingDoc.filename = uploadResult.public_id;
      existingDoc.originalName = req.file.originalname;
      existingDoc.cloudinaryUrl = uploadResult.secure_url;
      existingDoc.publicId = uploadResult.public_id;
      existingDoc.extractedText = extractedText;
      existingDoc.tags = tags;
      existingDoc.category = category;
      existingDoc.wordCount = wordCount;
      existingDoc.pageCount = pageCount;
      existingDoc.estimatedReadTime = estimatedReadTime;

      document = await existingDoc.save();
    } else {
      document = await Document.create({
        user: req.user._id,
        filename: uploadResult.public_id,
        originalName: req.file.originalname,
        cloudinaryUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        extractedText,
        mimeType: req.file.mimetype,
        tags,
        category,
        wordCount,
        pageCount,
        estimatedReadTime
      });
    }

    fs.unlinkSync(filePath);

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await cloudinary.uploader.destroy(document.publicId);
    await Conversation.deleteMany({ document: req.params.id });
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAnnotations = async (req, res) => {
  try {
    const { annotations } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    document.annotations = annotations;
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVersions = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ versions: document.versions, currentVersion: document });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const version = document.versions.find(v => v._id.toString() === versionId);
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const currentVersionData = {
      versionNumber: (document.versions?.length || 0) + 1,
      filename: document.filename,
      cloudinaryUrl: document.cloudinaryUrl,
      publicId: document.publicId,
      extractedText: document.extractedText,
      uploadedAt: new Date()
    };

    document.versions.push(currentVersionData);
    document.extractedText = version.extractedText;

    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const renameDocument = async (req, res) => {
  try {
    const { originalName } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    document.originalName = originalName;
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchDocuments = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }
    
    let documents;
    let useTextSearch = true;
    
    try {
      documents = await Document.find({
        user: req.user._id,
        $text: { $search: q }
      }).sort({ score: { $meta: 'textScore' } }).limit(20);
    } catch (indexError) {
      if (indexError.code === 27 || indexError.message.includes('text index')) {
        useTextSearch = false;
        documents = await Document.find({
          user: req.user._id,
          $or: [
            { originalName: { $regex: q, $options: 'i' } },
            { extractedText: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
          ]
        }).sort({ updatedAt: -1 }).limit(20);
      } else {
        throw indexError;
      }
    }
    
    const results = documents.map(doc => {
      const text = doc.extractedText || '';
      const queryLower = q.toLowerCase();
      const textLower = text.toLowerCase();
      const index = textLower.indexOf(queryLower);
      
      let snippet = '';
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + q.length + 100);
        snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
      }
      
      return {
        _id: doc._id,
        originalName: doc.originalName,
        tags: doc.tags,
        snippet
      };
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const shareDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.isShared) {
      return res.json({ 
        shareToken: document.shareToken, 
        shareUrl: `${req.protocol}://${req.get('host')}/shared/doc/${document.shareToken}` 
      });
    }

    const shareToken = crypto.randomBytes(16).toString('hex');
    document.shareToken = shareToken;
    document.isShared = true;
    await document.save();

    res.json({ 
      shareToken, 
      shareUrl: `${req.protocol}://${req.get('host')}/shared/doc/${shareToken}` 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unshareDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.shareToken = undefined;
    document.isShared = false;
    await document.save();

    res.json({ message: 'Document unshared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSharedDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ shareToken: req.params.token, isShared: true })
      .select('originalName extractedText tags category annotations');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found or not shared' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const decodeHtmlEntities = (str) => {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x2F;': '/', '&#x3D;': '=',
    '&#x27;': "'", '&#39;': "'", '&nbsp;': ' '
  };
  return str.replace(/&[^;]+;/g, (match) => entities[match] || match);
};

export const importFromUrl = async (req, res) => {
  try {
    let { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    url = decodeHtmlEntities(url);

    let validUrl;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        return res.status(400).json({ message: 'Only HTTP and HTTPS URLs are supported' });
      }
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;
    if (html.includes('cf-challenge') || html.includes('Just a moment') || html.includes('Turnstile')) {
      return res.status(403).json({ message: 'This website blocks automated requests. Try copying the content directly or using a different URL.' });
    }

    const $ = cheerio.load(html);
    
    $('script, style, nav, footer, header, iframe, noscript').remove();
    
    let title = $('h1').first().text().trim() || 
                 $('title').text().trim() || 
                 validUrl.hostname;
    
    const articleContent = [];
    
    $('article, main, .content, .post, .entry, [role="main"]').each((_, elem) => {
      $(elem).find('h1, h2, h3, h4, h5, h6, p, li, blockquote').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          articleContent.push(text);
        }
      });
    });
    
    if (articleContent.length === 0) {
      $('h1, h2, h3, h4, h5, h6, p, li, blockquote').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          articleContent.push(text);
        }
      });
    }

    const extractedText = articleContent.join('\n\n');

    if (!extractedText || extractedText.length < 100) {
      return res.status(400).json({ message: 'Could not extract enough content from this URL' });
    }

    const tags = await generateTags(extractedText);
    const category = await generateCategory(extractedText);

    const document = await Document.create({
      user: req.user._id,
      filename: `url-${Date.now()}`,
      originalName: `${title.slice(0, 100)}.txt`,
      cloudinaryUrl: '',
      publicId: '',
      extractedText: extractedText,
      mimeType: 'text/plain',
      tags,
      category
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('URL import error:', error);
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ message: 'Request timed out. The website took too long to respond.' });
    }
    if (error.response?.status === 403) {
      return res.status(403).json({ message: 'Access to this URL is forbidden. The website may be blocking requests.' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ message: 'Page not found at this URL.' });
    }
    res.status(500).json({ message: error.message || 'Failed to import from URL' });
  }
};
