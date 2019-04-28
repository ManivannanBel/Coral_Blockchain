const express = require('express');
const exprsshandlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const crypto = require('crypto');

const app = express();//Initialize express

app.use(bodyParser.urlencoded({extended: false}))

//HANDLEBARS TEMPLATE ENGINE MIDDLEWARE
app.engine('handlebars', exprsshandlebars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

//INDEX ROUTE
app.get('/', (req, res) =>{
    res.render('index');
});

//ADD USER ROUTE (POST REQUEST TO ADD A NEW USER DETAILS TO THE DATABASE)
app.post('/add_user', (req, res)=>{
        
    username = req.body.username;
    email = req.body.email.toLowerCase();
    phone = req.body.phone;
    password = req.body.password;

    let errors = []; //errors array

    //backend validation
    if(username.length == 0){
        errors.push({text:'Please enter username'});
    }
    if(email.length == 0){
        errors.push({text:'Please enter email id'});
    }
    if(phone.length == 0){
        errors.push({text:'Please enter phone number'});
    }
    if(password.length == 0){
        errors.push({text:'Please enter password'});
    }

    if(username.length > 25){
        errors.push({text:'Maximum username length is 25'});
    }
    if(email.length > 50){
        errors.push({text:'Maximum email length is 50'});
    }
    if(phone.length != 10){
        errors.push({text:'Phone number length must be 10'});
    }
    if(password.length > 50){
        errors.push({text:'Maximum password length is 50'});
    }

    if(errors.length > 0){ //if there are invalid data
        res.render('index', {
            errors : errors,
            userName : username,
            emailId : email,
            phoneNo : phone
        });
    }
    else{  //when all data are valid

        //select query find if the email id already exist or not
        const searchQuery = 'SELECT userName FROM userData WHERE emailId=?';
    
        getConnection().query(searchQuery, [email], (err, results, fields)=>{
            if(err){
                console.log(err);
                res.sendStatus(500);
                return;
            }
            
            if(results.length != 0){ //if email id alread exists
                errors = [{text : 'Email already exists'}];
                res.render('index', {
                    errors : errors,
                });
                return;
            }else{  //if not then insert the data

                const query = 'INSERT INTO userData(userName, emailId, phoneNo, password, dateTime) VALUES(?,?,?,?,?)';

                //hashing and stroring the password with md5 hash function
                const hash = crypto.createHash('md5').update(password).digest('hex');
                
                getConnection().query(query, [username, email, phone, hash, new Date(Date.now())], (err, results, fields) => {
                    if(err){
                        console.log(err);
                        res.sendStatus(500);
                        return;
                    }
                    
                    msg = 'User added!';
                    formData = [{userName : username, emailId : email, phoneNo : phone, dateTime : new Date(Date.now())}];
                    
                    res.render('users', 
                    {
                        msg : msg,
                        result : JSON.parse(JSON.stringify(formData))
                    });
                });
            }
        });   
    }
});

//EDIT USER ROUTE (EDIT USER BUTTON ON THE NAVBAR REDIRECTS TO THE EDIT USER PAGE)
app.get('/edit_user', (req, res)=>{
    res.render('update');
});

//EDIT USER ROUTE (GET REQUEST DIRECTS TO UPDATE USER PAGE WHERE THE CHANGES CAN BE MADE TO USER DATA)
app.get('/edit_user/:email', (req, res)=>{
        
    email = req.params.email.toLowerCase();
    let errors = [];
    
    if(errors.length > 0){
        res.render('index', {
            errors : errors
        });
    }
    else{

        const searchQuery = 'SELECT userName, emailId, phoneNo FROM userData WHERE emailId=?';
    
        getConnection().query(searchQuery, [email], (err, results, fields)=>{
            if(err){
                console.log(err);
                res.sendStatus(500);
                return;
            }
            
            if(results.length != 0){
                res.render('update', {
                    email : email,
                    result : results
                });
            }else{
                error = [{text:'User not fount'}];
                res.render('update', {
                    errors :error,
                    email : email,
                }); 
            }
        });   
    }
});

//SEARCH USER ROUTE (USED TO SEARCH THE USER USING EMAIL ID)
app.post('/search', (req, res)=>{
    emailId = req.body.searchemail.toLowerCase();
    const query = 'SELECT userName, emailId, phoneNo, dateTime FROM userData WHERE emailId=?';
    getConnection().query(query,[emailId], (err, result, fields)=>{
        if(err){
            console.log(err);
            res.sendStatus(500);
            return;
        }
        
        msg = 'User found';
        if(result.length==1){
            res.render('users',{
                result : JSON.parse(JSON.stringify(result)), 
                msg : msg                 
            });
        }else{
            errors = []
            errors.push({text : 'User not found'});
            res.render('index', {
                errors : errors
            });
        }
    })
});


//UPDATE USER ROUTE (USED TO UPDATE THE USER DETAILS BASED ON THE CHANGES MADE)
app.post('/update_user', (req, res)=>{

    oldEmail = req.body.old_email.toLowerCase();

    username = req.body.username;
    email = req.body.email.toLowerCase();
    phone = req.body.phone;
    old_password = req.body.old_password;
    new_password = req.body.new_password;
    
    let errors = [];

    //backend validation
    if(username.length == 0){
        errors.push({text:'Please enter username'});
    }
    if(email.length == 0){
        errors.push({text:'Please enter email id'});
    }
    if(phone.length == 0){
        errors.push({text:'Please enter phone number'});
    }
    if(new_password.length == 0){
        errors.push({text:'Please enter password'});
    }

    if(username.length > 25){
        errors.push({text:'Maximum username length is 25'});
    }
    if(email.length > 50){
        errors.push({text:'Maximum email length is 50'});
    }
    if(phone.length != 10){
        errors.push({text:'Phone number length must be 10'});
    }
    if(old_password.length > 50){
        errors.push({text:'Maximum password length is 50'});
    }

    formData = [{userName : username, emailId : email, phoneNo : phone}];

    if(errors.length > 0){
        console.log(errors.length+" errored");
        res.render('update', {
            errors : errors,
            result : JSON.parse(JSON.stringify(formData))
        });
        return;
    }else{
        
        const searchQuery = 'UPDATE userData SET userName=?, emailId=?, phoneNo=?, password=?, dateTime=? WHERE emailId=? and password=?';
        
        //converting new password and old password into md5 hash
        const oldPasswordHash = crypto.createHash('md5').update(old_password).digest('hex');
        const newPasswordHash = crypto.createHash('md5').update(new_password).digest('hex');

        getConnection().query(searchQuery, [username, email, phone, newPasswordHash, new Date(Date.now()), oldEmail, oldPasswordHash], (err, results, fields)=>{
            if(err){
                console.log(err);
                res.sendStatus(500);
                return;
            }else{
                formData = [{userName : username, emailId : email, phoneNo : phone, dateTime : new Date(Date.now())}];
                if(results.changedRows==1){
                    msg = 'Data updated';
                    res.render('users',{
                        msg : msg,
                        result : formData
                    });
                }else{
                    errors.push({text : 'Old password is incorrect'});
                    res.render('update',{
                        errors : errors,
                        result : formData
                    });
                }
                
            }
        });        
    }
});


//DELETE USER ROUTE (GET REQUEST THET TAKES USER TO THE DELETE PAGE)
app.get('/delete/:email', (req, res)=>{
    email = req.params.email;
    
    res.render('delete', {
        emailId : email
    })
});

//DELETE USER ROUTE (POST REQUEST THAT PERFORMS DELETION)
app.post('/delete',(req, res)=>{

    email = req.body.email.toLowerCase();
    password = req.body.password;

    const passwordHash = crypto.createHash('md5').update(password).digest('hex');

    const deleteQuery = "DELETE FROM userData WHERE emailId=? AND password=?";

    getConnection().query(deleteQuery, [email, passwordHash], (err, result, fields)=>{
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else{
            console.log(result);
            if(result.affectedRows==1){
                msg = 'User deleted';
                res.render('index',{
                    msg : msg
                });
            }else{
                error = [{text : 'incorrect password or no user found'}];
                res.render('delete',{
                    errors : error,
                    emailId : email
                });
            }
        }
    });

});


//CONNECTION FUNCTION
function getConnection(){
    return mysql.createConnection({
        host: 'db-intern.ciupl0p5utwk.us-east-1.rds.amazonaws.com',
        user: 'dummyUser',
        database: 'db_intern',
        password:'dummyUser01'
    });
}


//SERVER RUNS ON PORT 5000
app.listen(5000, ()=>{
    console.log('Server listens to port 5000.....');
});