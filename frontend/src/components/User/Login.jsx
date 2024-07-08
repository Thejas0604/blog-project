import React, { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

const Login = () => {
  //navigate
  const navigate = useNavigate();
  // user mutation
//   const userMutation = useMutation({
//     mutationKey: ["user-registration"],
//     mutationFn: loginAPI,
//   });
  // formik config
  const formik = useFormik({
    // initial data
    initialValues: {
      username: "masynctech",
      password: "12345",
    },
    // validation
    validationSchema: Yup.object({
      username: Yup.string().required("Username is required"),
      password: Yup.string().required("Password is required"),
    }),
    // submit
    onSubmit: (values) => {
      console.log(values);
      userMutation
        .mutateAsync(values)
        .then(() => {
          // redirect
          navigate("/dashboard");
        })
        .catch((err) => console.log(err));
    },
  });
  console.log(userMutation);
  const isLoading = postMutation.isPending;
  const isSuccess = postMutation.isSuccess;
  const isError = postMutation.isError;
  const error = postMutation.error;
  return (
    <div className="flex flex-wrap pb-24">
      <div className="w-full  p-4">
        <div className="flex flex-col justify-center py-24 max-w-md mx-auto h-full">
          <form onSubmit={formik.handleSubmit}>
            <Link
              to="/register"
              className="inline-block text-gray-500 hover: transition duration-200 mb-8"
            >
              <span>Don't have an account?</span> {""}
              <span />
              <span className="font-bold font-heading">Register</span>
            </Link>
            {/* show message */}
            {/* show alert */}

            <label
              className="block text-sm font-medium mb-2"
              htmlFor="textInput1"
            >
              Username
            </label>
            <input
              className="w-full rounded-full p-4 outline-none border border-gray-100 shadow placeholder-gray-500 focus:ring focus:ring-orange-200 transition duration-200 mb-4"
              type="text"
              placeholder="Enter username"
              {...formik.getFieldProps("username")}
            />
            {/* error */}
            {formik.touched.username && formik.errors.username && (
              <div className="text-red-500 mt-1">{formik.errors.username}</div>
            )}
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="textInput2"
            >
              Password
            </label>
            <div className="flex items-center gap-1 w-full rounded-full p-4 border border-gray-100 shadow mb-8">
              <input
                className="outline-none flex-1 placeholder-gray-500 "
                id="textInput2"
                type="password"
                placeholder="Enter password"
                {...formik.getFieldProps("password")}
              />
            </div>

            {/* error */}
            {formik.touched.password && formik.errors.password && (
              <div className="text-red-500 mt-1">{formik.errors.password}</div>
            )}

            <button
              className="h-14 inline-flex items-center justify-center py-4 px-6 text-white font-bold font-heading rounded-full bg-orange-500 w-full text-center border border-orange-600 shadow hover:bg-orange-600 focus:ring focus:ring-orange-200 transition duration-200 mb-8"
              type="submit"
            >
              Login
            </button>

            {/* forgot password link */}
            <Link className="mt-10 text-indigo-500" to="/forgot-password">
              Forgot Password?
            </Link>
            {isLoading && <div>Creating the post...</div>}
            {isSuccess && <div>Post created successfully</div>}
            {isError && <div>{error.response.data.message} </div>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
