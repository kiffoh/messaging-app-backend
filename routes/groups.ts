import express, { type Request, type Response, type NextFunction } from "express";
var router = express.Router();
import * as groupController from '../controllers/groupController.js';
import { uploadGroupPhoto } from '../configuration/multerConfig.js';
import { validateGroup } from "../configuration/validation.js";
import { validationResult, type FieldValidationError } from "express-validator";

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      errors: (errors.array() as FieldValidationError[]).map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

router.get('/:groupId/profile', groupController.getGroup);

router.put('/:groupId/profile', 
    uploadGroupPhoto.single('photo'), 
    validateGroup, // Add validation middleware
    validateRequest,
    groupController.updateGroup
);

router.delete('/:groupId/profile', groupController.deleteGroup);

router.post('/createDirectMessage', groupController.createDirectMessage);

router.post('/createGroup', 
    uploadGroupPhoto.single('groupPhoto'), 
    validateGroup,
    validateRequest,
    groupController.createGroup
);

export default router;