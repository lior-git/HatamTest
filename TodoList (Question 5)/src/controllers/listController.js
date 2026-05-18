const TodoList = require("../models/TodoList");

const createList = async (req, res) => {
  const { title } = req.body;
  const list = await TodoList.create({ title, owner: req.user._id });
  res.status(201).json(list);
};

const getLists = async (req, res) => {
  const lists = await TodoList.find({
    $or: [{ owner: req.user._id }, { sharedWith: req.user._id }],
  });
  res.status(200).json(lists);
};

const shareList = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const list = await TodoList.findOne({ _id: id, owner: req.user._id });
  if (!list) {
    return res
      .status(404)
      .json({ message: "List not found or not authorized" });
  }

  if (!list.sharedWith.includes(userId)) {
    list.sharedWith.push(userId);
    await list.save();
  }

  res.status(200).json(list);
};

module.exports = { createList, getLists, shareList };
