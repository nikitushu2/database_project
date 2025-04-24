CREATE TABLE blogs (
    id SERIAL PRIMARY KEY,
    author TEXT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    likes INTEGER DEFAULT 0
);

insert into blogs (author, url, title) values ('J. Rowling', 'test', 'Harry Potter');
insert into blogs (author, url, title) values ('E. Musk', 'test', 'Biography');