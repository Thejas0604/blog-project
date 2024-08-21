const express = require("express");
const categoryRouter = express.Router();
const categoryController = require("../../controllers/categories/categoryController");
const isAuthenticated = require("../../middleware/isAuthenticated");

//Create Category
categoryRouter.post(
  "/create",
  isAuthenticated,
  categoryController.createCategory
);

//get all categorys
categoryRouter.get("/", categoryController.getAllCategories);

//get category by id
categoryRouter.get("/:categoryId", categoryController.getCategoryById);

//update category
categoryRouter.put(
  "/:categoryId",
  isAuthenticated,
  categoryController.updateCategory
);

//delete category
categoryRouter.delete(
  "/:categoryId",
  isAuthenticated,
  categoryController.deleteCategory
);

module.exports = categoryRouter;
