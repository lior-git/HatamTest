const express = require('express');
const { createList, getLists, shareList } = require('../controllers/listController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

router.use(protect);

router.post('/', createList);
router.get('/', getLists);
router.post('/:id/share', shareList);

module.exports = router;
