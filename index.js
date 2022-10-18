require('dotenv').config()
const express = require('express');
const app = express();
const cors = require('cors');

const port = process.env.SERVER_PORT;

app.use(express.json());
app.use(cors());

const {PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT} = process.env;

if (PGUSER && PGHOST && PGPASSWORD && PGDATABASE && PGPORT) {
    async function main() {
        console.log('Using db version');
        const { Pool } = require('pg');
        const pool = new Pool();
    
        try {
            await pool.query('CREATE TABLE comments (ID SERIAL PRIMARY KEY, title VARCHAR(300), text VARCHAR(3000))');
            console.log('Table successfully created')
        } catch (error) {
            if (error.code === '42P07') {
                console.log('Table already created');
            } else {
                throw error;
            }
        }
    
        app.route('/api/comments')
            .post(async (req, res) => {
                const {title, text} = req.body;
                const db_res = await pool.query('INSERT INTO comments (title, text) VALUES ($1, $2) RETURNING title, text, ID', [title, text]);
                res.status(201).send(db_res.rows[0]);
            })
            .get(async (req, res) => {
                const db_res = await pool.query('SELECT * FROM comments');
                res.send(db_res.rows);
            });
    
        app.route('/api/comments/:id')
            .put(async (req, res) => {
                const {id} = req.params;
                const {title, text} = req.body;
                const db_res = await pool.query('UPDATE comments SET title = $1, text = $2 WHERE id = $3 RETURNING title, text, ID', [title, text, id]);
                res.send(db_res.rows);
            })
            .delete(async (req, res) => {
                let {id} = req.params;
                id = parseInt(id);
                await pool.query('DELETE FROM comments WHERE id = $1', [id]);
                res.sendStatus(204);
            });

        app.listen(port, function () {
            console.log('App listening on port ' + port);
        });
    }
    main();
} else {
    console.log('Using non-db version');
    const comments = [
        {
            title: 'Mein erster Kommentar',
            text: 'Das sind ja großartige Neuigkeiten!',
            id: 0
        }
    ];

    let idCounter = 1;

    app.route('/api/comments')
        .post((req, res) => {
            const id = idCounter++;
            const obj = {...req.body, id};
            comments.push(obj);
            res.status(201).send(obj);
        })
        .get((req, res) => {
            res.send(comments);
        });

    app.route('/api/comments/:id')
        .put((req, res) => {
            const {id} = req.params;
            const i = comments.findIndex(c => c.id === id);
            const obj = {...req.body, id};
            comments[i] = obj;
            res.send(obj);
        })
        .delete((req, res) => {
            let {id} = req.params;
            id = parseInt(id);
            const i = comments.findIndex(c => c.id === id);
            comments.splice(i, 1);
            res.sendStatus(204);
        });

    app.listen(port, function () {
        console.log('App listening on port ' + port);
    });
}