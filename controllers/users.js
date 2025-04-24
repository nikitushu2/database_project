const router = require('express').Router()

const { User, Blog } = require('../models')

router.get('/', async (req, res) => {
    const users = await User.findAll({
        include: {
            model: Blog,
            attributes: { exclude: ['userId'] }
        }
    })
    res.json(users)
})

router.post('/', async (req, res) => {
    try {
        const user = await User.create(req.body)
        res.json(user)
    } catch (error) {
        return res.status(400).json({ error })
    }
})

router.get('/:id', async (req, res) => {
    const where = {};

    if (req.query.read) {
        where.read = req.query.read === 'true';
    }

    const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['admin', 'disabled'] },
        include: [
            {
                model: Blog,
                as: 'readings',
                attributes: { exclude: ['userId', 'createdAt', 'updatedAt'] },
                through: {
                    attributes: ['id', 'read'],
                    as: 'readinglists',
                    where
                }
            }
        ]
    });
    if (user) {
        res.json(user)
    } else {
        res.status(404).end()
    }
})

router.put('/:username', async (req, res, next) => {
    const user = await User.findOne({ username: req.params.username })
    if (user) {
        user.username = req.body.username
        await user.save()
        res.json(user)
    } else {
        res.status(404).end()
    }

})

module.exports = router