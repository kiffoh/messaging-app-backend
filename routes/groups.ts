import express from "express";
var router = express.Router();
import * as groupController from '../controllers/groupController.js';
import { uploadGroupPhoto } from '../configuration/multerConfig.js';
import { validateGroup } from "../configuration/validation.js";

router.get('/:groupId/profile', groupController.getGroup);

router.put('/:groupId/profile', 
    uploadGroupPhoto.single('photo'), 
    validateGroup, // Add validation middleware
    groupController.updateGroup
);

router.delete('/:groupId/profile', groupController.deleteGroup);

router.post('/createDirectMessage', groupController.createDirectMessage);

router.post('/createGroup', 
    uploadGroupPhoto.single('groupPhoto'), 
    validateGroup,
    groupController.createGroup
);

export default router;