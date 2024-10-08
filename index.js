var express = require('express');
var app = express();
app.use(express.static('public'));
app.use(express.json());
var path = require('path');  
const fs = require('fs');
const Grid = require('gridfs-stream');
let gfs;

//const PDFParser = require('pdf-parse');
//const uploadDirectory = './uploads';
const multer = require('multer');
//const mammoth = require('mammoth');
//const pdf = require('html-pdf');
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
       cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
       cb(null, file.originalname);
    }
});
const upload = multer({ storage });
const uploadDirectory = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}
// database

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/learnNodeDB')
.then(() => {
   console.log('Connected to MongoDB');
   gfs = Grid(mongoose.connection.db, mongoose.mongo);
   gfs.collection('uploads');  // Set the collection to store files
})
.catch((err) => console.error('Failed to connect to MongoDB', err));

const userSchema = new mongoose.Schema({ 
    name: String ,
    age:Number,
    email:String
});
const User = mongoose.model('User', userSchema);
const fileSchema = new mongoose.Schema({
    filename: String,
    contentType: String,
    fileSize: Number,
    fileData: Buffer,  
    uploadDate: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

// example of middelware function -- Logs the URL and method of every request before passing control to the next
app.use(function (req, res, next) {
    console.log(`Request URL: ${req.url} | Method: ${req.method}`);
    next(); 
  });
  
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.post('/uploadFile', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const uploadedFile = req.file;
        const fileName = `${uploadedFile.originalname}`;
        const filePath = `${uploadDirectory}/${fileName}`;
        const fileData = fs.readFileSync(filePath);
        const newFile = new File({
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            fileSize: req.file.size,
            fileData: fileData  
        });
        await newFile.save(); 
        res.status(200).json({ success: true, message: 'File uploaded and saved to database!' });
    } catch (error) {
        console.error('An error occurred while processing the file:', error);
        res.status(500).json({ error: 'Failed to process the file' });
    }
});
//----------------------------------------------------- get the randome image
app.get('/displayImage', (req, res) => {
    res.render('imageViewer');
});

app.get('/randomImage', async (req, res) => {
    try {
        const randomFile = await File.aggregate([{ $sample: { size: 1 } }]);
        if (randomFile.length === 0) {
            return res.status(404).json({ error: 'No images found in the database' });
        }
        const file = randomFile[0];
        res.set({
            'Content-Type': file.contentType,
            'Content-Disposition': `inline; filename="${file.filename}"`
        });
        res.send(file.fileData);
    } catch (error) {
        console.error('Error fetching random file:', error);
        res.status(500).json({ error: 'Failed to retrieve a random file' });
    }
});

//----------------------------------------------------------------------------

app.get('/', function (req, res) {
    console.log(`id of this process ${process.pid}`);
    res.render('index', { title: 'Home Page register', message: 'register' });
})
var profileRouter = require('./profileRouter');
app.use('/profile', profileRouter);
//---------------------------------------------------------save user 
app.post('/user', async function (req, res) {
    const user = new User({
       name: req.body.name ,
      age:req.body.age,
       email:req.body.email});
     await user.save();
    // res.send('User saved!');
    res.json({ redirect: '/usersList' });
  });
// users list 
app.get('/usersList', async function (req, res) {
    const users = await User.find(); 
    res.render('usersList', { users });
});
app.delete('/deleteUser/:id', async function (req, res) {
    const userId = req.params.id; 
    try {
        const deletedUser = await User.findByIdAndDelete(userId); 
        if (deletedUser) {
            res.json({ success: true, message: 'User deleted successfully!' });
        } else {
            res.json({ success: false, message: 'User not found!' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
app.post('/editUser', async function (req, res) {
    const userId = req.body.userId; 
    try {
        const editUser = await User.findById(userId); 
        if (editUser) {
            // Send user data back as JSON
            res.json({ success: true, user: editUser });
        } else {
            res.json({ success: false, message: 'User not found!' });
        }
    } catch (error) {
        console.error('Error editing user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
app.get('/editUser', function (req, res) {
    const { name, age, email, id } = req.query;
    res.render('editUser', { name, age, email, id, title: 'Edit User' });
});

app.post('/userUpdate/:id', async function (req, res) {
    let id = req.params.id
    const user = {
       name: req.body.name ,
       age:req.body.age,
       email:req.body.email};
       await User.findByIdAndUpdate(id, user);
    // res.send('User saved!');
    res.json({ redirect: '/usersList' });
  });
//--------------------------------------------------------------------searching user
app.post('/searchUser', async function (req, res) {
    const searchName = req.body.searchName;
    try {
     //const users = await User.find(searchName); 
     const users = await User.find({ name: { $regex: searchName, $options: 'i' } }); 
      if (users.length > 0) {
        res.json({ success: true, users });
      } else {
        res.json({ success: false, message: 'No users found!' });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
  
//--------------------------------------------------------------URL parametrs  Route Parameters
app.get('/user/:id', function (req, res) {
    const userId = req.params.id; // Capturing URL parameter
    res.send(`User ID is: ${userId}`);
  });
//-----------------------------------------------------------------------------------
// This route reads the query parameter q from the URL like /search?q=nodejs.
app.get('/searchTest', function (req, res) {
    const searchTerm = req.query.q; // Extracting query parameter `q`
    res.send(`Search term is: ${searchTerm}`);
  });

app.post('/send', function (req, res) {
    const data = req.body; 
    res.send(`Received data: ${JSON.stringify(data)}`);
  });
  
app.get('/fruits', function (req, res) {
    res.send('fruits route');
});
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
  
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});