const jwt = require('jsonwebtoken')
const router = require('express').Router()

const { SECRET } = require('../util/config')
const User = require('../models/user')
const Session = require('../models/session')

router.post('/', async (request, response) => {
    const body = request.body

    const user = await User.findOne({
        where: {
            username: body.username
        }
    })

    const passwordCorrect = body.password === 'secret'

    if (!(user && passwordCorrect)) {
        return response.status(401).json({
            error: 'invalid username or password'
        })
    }

    if (user.disabled) {
        return response.status(401).json({
          error: 'account disabled, please contact admin'
        })
      }

    const userForToken = {
        username: user.username,
        id: user.id,
    }

    const token = jwt.sign(userForToken, SECRET)

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    await Session.create({
        userId: user.id,
        token,
        expiresAt,
        isActive: true
    })

    response
        .status(200)
        .send({ token, username: user.username, name: user.name })
})

router.delete('/', async (req, res) => {
    const authorization = req.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        const token = authorization.substring(7)
        
        const session = await Session.findOne({
            where: {
                token,
                isActive: true
            }
        })
        
        if (session) {
            session.isActive = false
            await session.save()
            return res.status(204).end()
        }
    }
    
    return res.status(401).json({ error: 'invalid or missing token' })
})

module.exports = router