import { useState } from "react";
import CreatePost from "./components/Posts/CreatePost";
import GetAllPosts from "./components/GetAllPosts";

function App() {
  return (
    <div>
      <CreatePost />
      <GetAllPosts />
    </div>
  );
}

export default App;
