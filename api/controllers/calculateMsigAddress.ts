import { Response } from 'express'
import { DEFAULT_CHAIN_URL, SOPRA_RECOVERY_ADDRESS } from '../../constants'
import { DEFAULT_GNOSIS_SAFE_SINGLETION_ADDRESS, DEFAULT_FALLBACK_HANDLER_ADDRESS, DEFAULT_PROXY_FACTORY_ADDRESS } from '../../gnosisSafe/constants'
import { calculateProxyAddress, setupInitilaizerAction } from '../../gnosisSafe/helpers'
import { GnosisMultisigCreateOptions } from '../../gnosisSafe/models'

export const calculateMsigAddress = async (req: any, res: any, next: any): Promise<Response> => {
  try {
    const { create_options, chain_url } = req.body
    const { owners, threshold, salt_nonce, safe_master, proxy_factory, fallback_handler, initializer_action } = create_options
    const chainUrl = chain_url || DEFAULT_CHAIN_URL
    const msigOptions: GnosisMultisigCreateOptions = {
      owners: [
        ...owners,
        SOPRA_RECOVERY_ADDRESS
      ],
      threshold,
      saltNonce: salt_nonce,
      gnosisSafeMaster: safe_master || DEFAULT_GNOSIS_SAFE_SINGLETION_ADDRESS,
      proxyFactory: proxy_factory || DEFAULT_PROXY_FACTORY_ADDRESS,
      fallbackHandler: fallback_handler || DEFAULT_FALLBACK_HANDLER_ADDRESS,
      initializerAction: setupInitilaizerAction(initializer_action)
    }
    const calculatedAddress = await calculateProxyAddress(msigOptions, chainUrl)

    return res.status(201).json({
      success: true,
      errorCode: '',
      result: {
        calculatedAddress
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

