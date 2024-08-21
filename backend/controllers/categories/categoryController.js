const asyncHandler = require("express-async-handler");
const Category = require("../../models/Category/Category");

categoryController = {
  //create category
  createCategory: asyncHandler(async (req, res) => {
    const { categoryName, categoryDescription } = req.body;
    //already exsiting categories
    const categoryFound = await Category.findOne({ categoryName });
    if (categoryFound) {
      throw new Error("Category already exsits.");
    }
    //console.log(req);

    const categoryCreated = await Category.create({
      categoryName,
      createdBy: req.user,
      categoryDescription,
    });

    res.status(201).json({
      status: "success",
      message: "Category created successfully",
      categoryCreated,
    });
  }),
  //get all categories
  getAllCategories: asyncHandler(async (req, res) => {
    const categories = await Category.find();
    res.status(200).json({
      status: "success",
      categories,
    });
  }),
  //get category by id
  getCategoryById: asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId;
    const categoryFound = await Category.findById(categoryId);
    if (!categoryFound) {
      throw new Error("Category not found");
    }
    res.status(200).json({
      status: "success",
      message: "Category found",
      categoryFound,
    });
  }),
  //update category
  updateCategory: asyncHandler(async (req, res) => {
    //console.log(req.params);
    const categoryId = req.params.categoryId;
    const categoryFound = await Category.findById(categoryId);
    if (!categoryFound) {
      throw new Error("Category not found");
    }
    const categoryUpdated = await Category.findByIdAndUpdate(
      categoryId,
      {
        categoryName: req.body.categoryName,
        categoryDescription: req.body.categoryDescription,
      },
      {
        new: true,
      }
    );
    res.status(200).json({
      status: "success",
      message: "Category updated successfully",
      categoryUpdated,
    });
  }),
  //delete category
  deleteCategory: asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId;
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      throw new Error("Category not found");
    }
    res.status(200).json({
      status: "success",
      message: "Category deleted successfully",
      deletedCategory,
    });
  }),
};

module.exports = categoryController;
