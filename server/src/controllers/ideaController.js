import * as ideaService from '../services/ideaService.js';

export async function list(req, res, next) {
  try {
    const result = await ideaService.listIdeas(req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const idea = await ideaService.createIdea(req.user.id, req.body);
    res.status(201).json({ success: true, data: idea });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const idea = await ideaService.getIdeaById(req.params.ideaId, req.user.id);
    res.json({ success: true, data: idea });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const idea = await ideaService.updateIdea(req.params.ideaId, req.user.id, req.body);
    res.json({ success: true, data: idea });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await ideaService.deleteIdea(req.params.ideaId, req.user.id);
    res.json({ success: true, message: 'Idea workspace deleted' });
  } catch (error) {
    next(error);
  }
}

export async function archive(req, res, next) {
  try {
    const idea = await ideaService.archiveIdea(req.params.ideaId, req.user.id);
    res.json({ success: true, data: idea });
  } catch (error) {
    next(error);
  }
}

export async function finalize(req, res, next) {
  try {
    const idea = await ideaService.finalizeIdea(req.params.ideaId, req.user.id);
    res.json({ success: true, data: idea });
  } catch (error) {
    next(error);
  }
}

export async function listSections(req, res, next) {
  try {
    const sections = await ideaService.listSections(req.params.ideaId, req.user.id);
    res.json({ success: true, data: sections });
  } catch (error) {
    next(error);
  }
}

export async function createSection(req, res, next) {
  try {
    const section = await ideaService.createSection(req.params.ideaId, req.user.id, req.body);
    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
}

export async function updateSection(req, res, next) {
  try {
    const section = await ideaService.updateSection(req.params.ideaId, req.params.sectionId, req.user.id, req.body);
    res.json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
}

export async function listCollection(req, res, next) {
  try {
    const data = await ideaService.listCollection(req.params.collection, req.params.ideaId, req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createCollectionItem(req, res, next) {
  try {
    const item = await ideaService.createCollectionItem(req.params.collection, req.params.ideaId, req.user.id, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function updateCollectionItem(req, res, next) {
  try {
    const item = await ideaService.updateCollectionItem(req.params.collection, req.params.ideaId, req.params.itemId, req.user.id, req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function deleteCollectionItem(req, res, next) {
  try {
    await ideaService.deleteCollectionItem(req.params.collection, req.params.ideaId, req.params.itemId, req.user.id);
    res.json({ success: true, message: 'Idea item deleted' });
  } catch (error) {
    next(error);
  }
}

export async function listComments(req, res, next) {
  try {
    const comments = await ideaService.listComments(req.params.ideaId, req.user.id);
    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
}

export async function createComment(req, res, next) {
  try {
    const comment = await ideaService.createComment(req.params.ideaId, req.user.id, req.body);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
}

export async function updateComment(req, res, next) {
  try {
    const comment = await ideaService.updateComment(req.params.ideaId, req.params.commentId, req.user.id, req.body);
    res.json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req, res, next) {
  try {
    await ideaService.deleteComment(req.params.ideaId, req.params.commentId, req.user.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
}

export async function createVersion(req, res, next) {
  try {
    const version = await ideaService.createVersion(req.params.ideaId, req.user.id, req.body);
    res.status(201).json({ success: true, data: version });
  } catch (error) {
    next(error);
  }
}

export async function listVersions(req, res, next) {
  try {
    const versions = await ideaService.listVersions(req.params.ideaId, req.user.id);
    res.json({ success: true, data: versions });
  } catch (error) {
    next(error);
  }
}

export async function restoreVersionPreview(req, res, next) {
  try {
    const preview = await ideaService.restoreVersionPreview(req.params.ideaId, req.params.versionId, req.user.id);
    res.json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
}

export async function conversionPreview(req, res, next) {
  try {
    const plan = await ideaService.buildConversionPlan(req.params.ideaId, req.user.id, req.body);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

export async function convert(req, res, next) {
  try {
    const result = await ideaService.convertIdea(req.params.ideaId, req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function ai(req, res, next) {
  try {
    const result = await ideaService.aiSuggestion(req.params.ideaId, req.user.id, req.params.action);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
