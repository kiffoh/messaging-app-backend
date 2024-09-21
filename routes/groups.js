var express = require('express');
var router = express.Router();
const groupController = require('../controllers/groupController')
const upload = require('../configuration/multerConfig')

router.get('/:groupId/profile', groupController.getGroup);

router.put('/:groupId/profile', groupController.updateGroup);

router.delete('/:groupId/profile', groupController.deleteGroup);

router.post('/createDirectMessage', groupController.createDirectMessage);

router.post('/createGroup', upload.single('groupPhoto'), groupController.createGroup);

module.exports = router;