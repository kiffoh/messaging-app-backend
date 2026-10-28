import express from "express";
var router = express.Router();
import * as userController from '../controllers/userController.js';
import { uploadUserPhoto } from '../configuration/multerConfig.js';
import { validateUserSignUp, validateUser } from '../configuration/validation.js';

/* GET users listing. */
router.post('/signup', 
    validateUserSignUp,
    userController.createUser
);

router.post('/login', userController.logIn);

router.get('/:userId/profile', userController.getUser);

router.put('/:userId/profile', 
    uploadUserPhoto.single('photo'), 
    validateUser, // Validation middleware
    userController.updateUser
);
  

router.delete('/:userId/profile', userController.deleteUser);

router.get('/usernames', userController.getAllUsernames);

router.put('/:userId/update-contacts', userController.updateUserContacts)



export default router;
