const router = require('express').Router()
const { SECRET } = require('../util/config')
const jwt = require('jsonwebtoken')
const {Op} = require('sequelize')

const { Blog, User, ReadingList, Session } = require('../models')

const blogFinder = async (req, res, next) => {
    req.blog = await Blog.findByPk(req.params.id)
    next()
}

const tokenExtractor = async (req, res, next) => {
    const authorization = req.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
      try {
        req.decodedToken = jwt.verify(authorization.substring(7), SECRET)
        const session = await Session.findOne({
          where: {
              token,
              isActive: true
          }
      })

      if (!session) {
        return res.status(401).json({ error: 'session not found or inactive' })
    }

      if (new Date() > new Date(session.expiresAt)) {
        session.isActive = false
        await session.save()
        return res.status(401).json({ error: 'session expired' })
    }

    req.session = session
      

      } catch{
        return res.status(401).json({ error: 'token invalid' })
      }
    }  else {
      return res.status(401).json({ error: 'token missing' })
    }
    next()
  }

  const isAdmin = async (req, res, next) => {
    const user = await User.findByPk(req.decodedToken.id)
    if (!user.admin) {
      return res.status(401).json({ error: 'operation not allowed' })
    }
    next()
  }

router.get('/', async (req, res) => {
    const where = {}

    if (req.query.search) {
        const searchTerm = `%${req.query.search}%`
        where[Op.or] = [
          {
            title: {
              [Op.iLike]: searchTerm
            }
          },
          {
            author: {
              [Op.iLike]: searchTerm
            }
          }
        ]
      }

    const blogs = await Blog.findAll({
        attributes: { exclude: ['userId'] },
        include: {
          model: User,
          attributes: ['name']
        },
        where,
        order: [
            ['likes', 'DESC'],
        ]
      })
    console.log(JSON.stringify(blogs))
    res.json(blogs)
})

router.post('/', tokenExtractor, async (req, res, next) => {
    try {
        const user = await User.findByPk(req.decodedToken.id)
        const blog = await Blog.create({...req.body, userId: user.id, date: new Date()})
        res.json(blog)
    } catch (error) {
        return res.status(400).json({ error })
    }

})

router.get('/:id', blogFinder, async (req, res) => {
    if (req.blog) {
        console.log(req.blog.toJSON())
        res.json(req.blog)
    } else {
        res.status(404).end()
    }
})

router.put('/:id', blogFinder, async (req, res, next) => {
    try {
        if (req.blog) {
            req.blog.author = req.body.author
            req.blog.url = req.body.url
            req.blog.title = req.body.title
            req.blog.likes = Number(req.body.likes)
            await req.blog.save()
            res.json(req.blog)
        } else {
            res.status(404).end()
        }
    } catch (error) {
        next(error)
    }

})

router.delete('/:id', blogFinder, tokenExtractor, async (req, res) => {
    if (req.blog) {
        const user = await User.findByPk(req.decodedToken.id)
        if (req.blog.userId === user.id) {
            await req.blog.destroy();
            res.status(204).end()
        } else {
            res.status(404).json({ error: "Users can delete only their own blogs" })
        }
    } else {
        res.status(404).json({ error: "Blog not found" })
    }
})

router.put('/:username', tokenExtractor, isAdmin, async (req, res) => {
  const user = await User.findOne({
    where: {
      username: req.params.username
    }
  })

  if (user) {
    user.disabled = req.body.disabled
    await user.save()
    res.json(user)
  } else {
    res.status(404).end()
  }
})

router.post('/readinglists', tokenExtractor, async (req, res) => {
  try {
    const readingList = await ReadingList.create(req.body)
    res.json(readingList)
} catch (error) {
    return res.status(400).json({ error })
}
})

router.put('/readinglists/:id', tokenExtractor, async (req, res) => {
  const readingList = await ReadingList.findOne({
    where: {
      id: req.params.id
    }
  })

  if (readingList) {
    readingList.read = req.body.read
    await readingList.save()
    res.json(readingList)
  } else {
    res.status(404).end()
  }
})

const errorHandler = (error, request, response, next) => {
    console.error(error.message)

    if (error.name === 'CastError') {
        return response.status(400).send({ error: 'malformatted id' })
    } else if (error.name === 'ValidationError') {
        return response.status(400).json({ error: error.message })
    }

    next(error)
}


module.exports = { router, errorHandler }