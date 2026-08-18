import { Router } from 'express';
import { getCommentById, deleteComment, createAuditLog } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateId } from '../utils/id.js';

const router = Router();

router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const id = req.params.id as string;
    const user = req.user!;
    const comment = getCommentById(id);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    if (comment.userId !== user.id && user.role !== 'Referee' && user.role !== 'Council') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (comment.deletedAt) {
      res.status(410).json({ error: 'Comment already deleted' });
      return;
    }
    const deleted = deleteComment(id, user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'delete_comment',
      targetType: 'comment',
      targetId: id,
      meta: { originalTargetType: comment.targetType, originalTargetId: comment.targetId },
      createdAt: new Date().toISOString(),
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
