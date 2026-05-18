const Task = require("../models/Task");
const TodoList = require("../models/TodoList");
const { getCache, setCache, delCache } = require("../utils/cache");

const checkListAccess = async (listId, userId) => {
  const list = await TodoList.findOne({
    _id: listId,
    $or: [{ owner: userId }, { sharedWith: userId }],
  });
  return list;
};

const getTasks = async (req, res) => {
  const { listId } = req.query;
  if (!listId) {
    return res
      .status(400)
      .json({ message: "listId query parameter is required" });
  }

  const list = await checkListAccess(listId, req.user._id);
  if (!list) {
    return res.status(403).json({ message: "Access denied" });
  }

  const cacheKey = `tasks:${listId}`;
  const cachedTasks = await getCache(cacheKey);
  if (cachedTasks) {
    return res.status(200).json(cachedTasks);
  }

  const tasks = await Task.find({ list: listId });
  await setCache(cacheKey, tasks);
  res.status(200).json(tasks);
};

const createTask = async (req, res) => {
  const {
    title,
    description,
    list: listId,
    isRecurring,
    recurrenceFrequency,
    dueDate,
  } = req.body;

  const list = await checkListAccess(listId, req.user._id);
  if (!list) {
    return res.status(403).json({ message: "Access denied" });
  }

  const task = await Task.create({
    title,
    description,
    list: listId,
    isRecurring,
    recurrenceFrequency,
    dueDate,
  });

  await delCache(`tasks:${listId}`);
  res.status(201).json(task);
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    status,
    title,
    description,
    isRecurring,
    recurrenceFrequency,
    dueDate,
  } = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const hasAccess = await checkListAccess(task.list, req.user._id);
  if (!hasAccess) {
    return res.status(403).json({ message: "Access denied" });
  }

  const updatedTask = await Task.findByIdAndUpdate(
    id,
    { status, title, description, isRecurring, recurrenceFrequency, dueDate },
    { new: true },
  );

  await delCache(`tasks:${task.list}`);
  res.status(200).json(updatedTask);
};

const deleteTask = async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const hasAccess = await checkListAccess(task.list, req.user._id);
  if (!hasAccess) {
    return res.status(403).json({ message: "Access denied" });
  }

  await Task.findByIdAndDelete(id);
  await delCache(`tasks:${task.list}`);
  res.status(200).json({ message: "Task deleted" });
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
