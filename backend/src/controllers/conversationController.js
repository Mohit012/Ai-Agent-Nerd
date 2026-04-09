import Conversation from '../models/Conversation.js';
import crypto from 'crypto';

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt');
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConversationFolder = async (req, res) => {
  try {
    const { folder } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { folder },
      { new: true }
    );
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const renameConversation = async (req, res) => {
  try {
    const { title } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { title },
      { new: true }
    );
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const shareConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.isShared) {
      return res.json({ 
        shareToken: conversation.shareToken, 
        shareUrl: `${req.protocol}://${req.get('host')}/shared/chat/${conversation.shareToken}` 
      });
    }

    const shareToken = crypto.randomBytes(16).toString('hex');
    conversation.shareToken = shareToken;
    conversation.isShared = true;
    await conversation.save();

    res.json({ 
      shareToken, 
      shareUrl: `${req.protocol}://${req.get('host')}/shared/chat/${shareToken}` 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unshareConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.shareToken = undefined;
    conversation.isShared = false;
    await conversation.save();

    res.json({ message: 'Conversation unshared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSharedConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ shareToken: req.params.token, isShared: true })
      .select('title messages folder');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or not shared' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
