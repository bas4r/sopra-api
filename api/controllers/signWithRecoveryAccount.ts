import { Response } from 'express'
import { DEFAULT_CHAIN_URL, SOPRA_RECOVERY_PRIVATE_KEY } from '../../constants'
import { containsSafeSpecificField, signSafeTransaction, transactionToSafeTx } from '../../gnosisSafe/helpers'
import { GnosisSafeTransaction } from '../../gnosisSafe/models'

export const signWithRecoveryAccount = async (req: any, res: any, next: any): Promise<Response> => {
  try {
    const { multisig_address: multisigAddress, transaction, chain_url } = req.body
    const chainUrl = chain_url || DEFAULT_CHAIN_URL
    const gnoisSafeTx: GnosisSafeTransaction = containsSafeSpecificField(transaction) ? transaction : await transactionToSafeTx(transaction)
    const privateKey = SOPRA_RECOVERY_PRIVATE_KEY as string
    const gnosisSignature = await signSafeTransaction(privateKey, multisigAddress, gnoisSafeTx, chainUrl)

    return res.status(201).json({
      success: true,
      errorCode: '',
      result: {
        gnoisSafeTx,
        gnosisSignature
      }
    })
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      errorCode: '',
      message: error.message || 'Something went wrong.',
      error: error
    })
  }
}

