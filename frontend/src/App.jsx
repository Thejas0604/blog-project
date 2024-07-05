import CreatePost from "./components/Posts/CreatePost";
import GetAllPosts from "./components/Posts/GetAllPosts";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import PublicNavbar from "./components/Navbar/PublicNavbar";
import Home from "./components/Home/Home";
import UpdatePost from "./components/Posts/UpdatePost";
import PostDetails from "./components/Posts/PostDetails";



function App() {
  return (
    <div>
      <BrowserRouter>
        <PublicNavbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/list" element={<GetAllPosts />} />
          <Route path="/posts/:postId" element={<PostDetails />} /> 
          <Route path="/posts/update-post/:postId" element={<UpdatePost />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
