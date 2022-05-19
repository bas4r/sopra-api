import { Response } from 'express'
import { isNullOrEmpty } from '../../helpers'
import { DEFAULT_CHAIN_URL, SOPRA_RECOVERY_PRIVATE_KEY } from '../../constants'
import { containsSafeSpecificField, getSafeExecuteTransaction, sendTransaction, signSafeTransaction, signTransaction, transactionToSafeTx } from '../../gnosisSafe/helpers'
import { GnosisSafeSignature, GnosisSafeTransaction } from '../../gnosisSafe/models'

export const signAndSendWithRecoveryAccount = async (req: any, res: any, next: any): Promise<Response> => {
  try {
    const { multisig_address: multisigAddress, transaction, signatures, owners_private_keys: ownersPrivateKeys, chain_url } = req.body
    const chainUrl = chain_url || DEFAULT_CHAIN_URL
    const gnoisSafeTx: GnosisSafeTransaction = containsSafeSpecificField(transaction) ? transaction : await transactionToSafeTx(transaction)
    const privateKey = SOPRA_RECOVERY_PRIVATE_KEY as string
    const gnosisSignature = await signSafeTransaction(privateKey, multisigAddress, gnoisSafeTx, chainUrl)

    let ownersSignatures: GnosisSafeSignature[] = []
    if(ownersPrivateKeys?.length > 0) {
      const ownersSignaruesPomises = ownersPrivateKeys.map((key: string) => signSafeTransaction(key, multisigAddress, gnoisSafeTx, chainUrl))
      ownersSignatures = await Promise.all(ownersSignaruesPomises)
    }
    const allSignatures: GnosisSafeSignature[] = [gnosisSignature]
    if(!isNullOrEmpty(signatures)) allSignatures.concat(signatures)
    if(!isNullOrEmpty(ownersSignatures)) allSignatures.concat(ownersSignatures)
    const ethTransaction = await getSafeExecuteTransaction(multisigAddress, gnoisSafeTx, chainUrl, allSignatures)
    const signedHash = await signTransaction(ethTransaction, privateKey, chainUrl)
    const transactionResult = await sendTransaction(signedHash, chainUrl)

    return res.status(201).json({
      success: true,
      errorCode: '',
      result: {
        gnoisSafeTx,
        gnosisSignature,
        transactionResult
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
