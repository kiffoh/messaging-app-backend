import express, { type Request, type Response, type NextFunction } from "express";
var router = express.Router();
import * as userController from '../controllers/userController.js';
import { uploadUserPhoto } from '../configuration/multerConfig.js';
import { validateUserSignUp, validateUser } from '../configuration/validation.js';
import { validationResult, type FieldValidationError } from "express-validator";

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors)
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

/* GET users listing. */
router.post('/signup', 
    validateUserSignUp,
    validateRequest,
    userController.createUser
);

router.post('/login', userController.logIn);

router.get('/:userId/profile', userController.getUser);

router.put('/:userId/profile', 
    uploadUserPhoto.single('photo'), 
    validateUser, // Validation middleware
    validateRequest,
    userController.updateUser
);
  

router.delete('/:userId/profile', userController.deleteUser);

router.get('/usernames', userController.getAllUsernames);

router.put('/:userId/update-contacts', userController.updateUserContacts)



export default router;
