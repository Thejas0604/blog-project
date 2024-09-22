const express = require("express");
const categoryRouter = express.Router();
const categoryController = require("../../controllers/categories/categoryController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const verifyRole = require("../../middleware/roleMiddleware")


//Create Category
categoryRouter.post(
  "/create",
  isAuthenticated,
  verifyRole("admin"),
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
  verifyRole("admin"),
  categoryController.updateCategory
);

//delete category
categoryRouter.delete(
  "/:categoryId",
  isAuthenticated,
  verifyRole("admin"),
  categoryController.deleteCategory
);

module.exports = categoryRouter;
