require("dotenv").config();

const app = require("./server")
const { PORT } = process.env;

app.get('/', (req, res) => {
    res.send("<h3>server started running.....</h3>")
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})
