const express = require('express');
const app = express();

const port = 3000;

app.listen(port, () => {
    console.log("Server running on port ${port}");
});

//*Todo: Check whether nodemon still needs to be installed or not

