import express from 'express'

const router = express.Router()

import { createMsigAccount, calculateMsigAddress, signWithRecoveryAccount, signAndSendWithRecoveryAccount } from './controllers'

router.post('/calculateMsigAddress', calculateMsigAddress)
router.post('/createMsigAccount', createMsigAccount)
router.post('/sign', signWithRecoveryAccount)
router.post('/signAndSend', signAndSendWithRecoveryAccount)


export default router
