import { Router } from 'express';
import { createDocumentSchema, updateDocumentSchema } from '@kova/shared';
import { validate } from '../middleware/validate.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { DocumentService } from '../services/document.service.js';
import { AppError } from '../services/auth.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const documents = await DocumentService.list(req.userId!);
    res.json({ documents });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.post('/', validate(createDocumentSchema), async (req: AuthRequest, res) => {
  try {
    const workspaceId = await DocumentService.getWorkspaceId(req.userId!);
    const document = await DocumentService.create(workspaceId, req.body);
    res.status(201).json({ document });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.get('/trash', async (req: AuthRequest, res) => {
  try {
    const documents = await DocumentService.listTrash(req.userId!);
    res.json({ documents });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.post('/:id/restore', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await DocumentService.restore(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.delete('/:id/permanent', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await DocumentService.permanentDelete(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const document = await DocumentService.getById(id, req.userId!);
    res.json({ document });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.patch('/:id', validate(updateDocumentSchema), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const document = await DocumentService.update(id, req.userId!, req.body);
    res.json({ document });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await DocumentService.delete(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

export default router;
