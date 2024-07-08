import React, { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { registerAPI } from "../../Services/usersAPI";
import { useMutation } from "@tanstack/react-query";
//import AlertMessage from "../Alert/AlertMessage";

const Register = () => {
  const userMutation = useMutation({
    mutationKey: ["register-user"],
    mutationFn: registerAPI,
  });
  const formik = useFormik({
    initialValues: {
      username: "",
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Username is required"),
      email: Yup.string().email().required("Email is required"),
      password: Yup.string().required("Password is required"),
    }),
    onSubmit: (values) => {
      console.log(values);
      userMutation.mutate(values);
    },
  });
  console.log(userMutation);
  const isLoading = userMutation.isPending;
  const isSuccess = userMutation.isSuccess;
  const isError = userMutation.isError;
  const error = userMutation.error;
  return (
    <div className="flex flex-wrap pb-24">
      <div className="w-full  p-4">
        <div className="flex flex-col justify-center py-24 max-w-md mx-auto h-full">
          <form onSubmit={formik.handleSubmit}>
            <Link
              to="/login"
              className="inline-block text-gray-500 hover: transition duration-200 mb-8"
            >
              <span>Already have an account?</span>
              <span />
              <span className="font-bold font-heading">Login</span>
            </Link>
            {/* {userMutation.isPending && (
              <AlertMessage type="loading" message="Loading please wait..." />
            )}
            {userMutation.isSuccess && (
              <AlertMessage type="success" message="Login success" />
            )}
            {userMutation.isError && (
              <AlertMessage
                type="error"
                message={userMutation.error.response.data.message}
              />
            )} */}

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
              htmlFor="textInput1"
            >
              Email
            </label>
            <input
              className="w-full rounded-full p-4 outline-none border border-gray-100 shadow placeholder-gray-500 focus:ring focus:ring-orange-200 transition duration-200 mb-4"
              type="text"
              placeholder="sample@gmail.com"
              {...formik.getFieldProps("email")}
            />
            {/* error */}
            {formik.touched.email && formik.errors.email && (
              <div className="text-red-500 mt-1">{formik.errors.email}</div>
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
              Sign Up
            </button>
            {isLoading && <div>Loading</div>}
            {isSuccess && <div>Registered Succefully</div>}
            {isError && <div>{error.response.data.message} </div>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
