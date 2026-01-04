const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class TranzitPayService {
  constructor() {
    this.apiKey = process.env.TRANZITPAY_API_KEY;
    this.baseUrl = 'https://api.tranzit.com.ng';
  }

  /**
   * Generate unique transaction reference
   */
  generateReference(prefix = 'TXN') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`.substring(0, 30);
  }

  /**
   * Map network names to TranzitPay service codes
   */
  getNetworkCode(network) {
    const networkMap = {
      'MTN': '1',
      'GLO': '2',
      'Glo': '2',
      'AIRTEL': '3',
      'Airtel': '3',
      '9MOBILE': '4',
      '9mobile': '4'
    };
    return networkMap[network] || '1';
  }

  /**
   * Get network display name for data plans
   */
  getNetworkDisplayName(network) {
    const networkMap = {
      'MTN': 'MTN(SME)',
      'GLO': 'GLO',
      'Glo': 'GLO',
      'AIRTEL': 'AIRTEL',
      'Airtel': 'AIRTEL',
      '9MOBILE': '9MOBILE',
      '9mobile': '9MOBILE'
    };
    return networkMap[network] || 'MTN(SME)';
  }

  /**
   * Get all data plans
   */
  async getDataPlans(network = null) {
    try {
      const response = await axios.get(`${this.baseUrl}/get`, {
        params: { Action: 'DATA' },
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      let plans = response.data;

      // Filter by network if specified
      if (network) {
        const networkDisplay = this.getNetworkDisplayName(network);
        plans = plans.filter(plan => 
          plan.network.toLowerCase().includes(networkDisplay.toLowerCase())
        );
      }

      // Transform to simpler format for telegram bot
      return plans.map(plan => ({
        name: plan.bundle,
        code: plan.planID,
        price: parseFloat(plan.price),
        network: plan.network,
        planID: plan.planID
      }));
    } catch (error) {
      throw new Error(`Failed to fetch data plans: ${error.message}`);
    }
  }

  /**
   * Get service availability
   */
  async getServiceAvailability() {
    try {
      const response = await axios.get(`${this.baseUrl}/get`, {
        params: { Action: 'SERVICES' },
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch service availability: ${error.message}`);
    }
  }

  /**
   * Buy airtime
   */
  async buyAirtime(phoneNumber, network, amount) {
    try {
      const networkCode = this.getNetworkCode(network);
      const reference = this.generateReference('AIRTIME');

      const response = await axios.post(
        this.baseUrl,
        {
          Action: 'AIRTIME',
          Service: networkCode,
          Amount: amount.toString(),
          Number: phoneNumber,
          Ref: reference
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Airtime purchase failed: ${error.response?.data?.response || error.message}`);
    }
  }

  /**
   * Buy data
   * @param {string} phoneNumber - Phone number
   * @param {string} network - Network name (MTN, GLO, Airtel, 9mobile)
   * @param {string} planCode - Plan ID from getDataPlans()
   */
  async buyData(phoneNumber, network, planCode) {
    try {
      const reference = this.generateReference('DATA');

      const response = await axios.post(
        this.baseUrl,
        {
          Action: 'DATA',
          Plan: planCode,
          Number: phoneNumber,
          Ref: reference
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Data purchase failed: ${error.response?.data?.response || error.message}`);
    }
  }

  /**
   * Pay for cable TV
   */
  async payCableTv(smartCardNumber, provider, planCode) {
    try {
      // Map provider names to codes
      const providerMap = {
        'GOTV': '1',
        'DSTV': '2',
        'STARTIMES': '3'
      };

      const providerCode = providerMap[provider.toUpperCase()] || '1';
      const reference = this.generateReference('CABLE');

      const response = await axios.post(
        this.baseUrl,
        {
          Action: 'CABLE',
          Service: providerCode,
          Plan: planCode,
          Number: smartCardNumber,
          Ref: reference
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Cable TV payment failed: ${error.response?.data?.response || error.message}`);
    }
  }

  /**
   * Pay electricity bill
   */
  async payElectricity(meterNumber, provider, amount, meterType) {
    try {
      // Map meter types
      const meterTypeMap = {
        'PREPAID': '1',
        'POSTPAID': '2'
      };

      // Map electricity providers (DISCOs)
      const providerMap = {
        'AEDC': '800',
        'BEDC': '801',
        'EKEDC': '802',
        'EEDC': '803',
        'IKEDC': '804',
        'IBDC': '805',
        'PHED': '806',
        'JED': '807',
        'KEDCO': '808',
        'KADCO': '809',
        'ABA': '810'
      };

      const meterTypeCode = meterTypeMap[meterType.toUpperCase()] || '1';
      const providerCode = providerMap[provider.toUpperCase()] || '800';
      const reference = this.generateReference('ELE');

      const response = await axios.post(
        this.baseUrl,
        {
          Action: 'ELE',
          Service: meterTypeCode,
          Plan: providerCode,
          Amount: amount.toString(),
          Number: meterNumber,
          Ref: reference
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Electricity payment failed: ${error.response?.data?.response || error.message}`);
    }
  }

  /**
   * Buy exam PIN
   */
  async buyExamPin(examType, quantity) {
    try {
      const examMap = {
        'WAEC': '1',
        'WAEC_GCE': '2',
        'NECO': '3',
        'NATEB': '4',
        'JAMB': '5'
      };

      const examCode = examMap[examType.toUpperCase()] || '1';
      const reference = this.generateReference('EXAM');

      const response = await axios.post(
        this.baseUrl,
        {
          Action: 'EXAM',
          Service: examCode,
          Number: quantity.toString(),
          Ref: reference
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Exam PIN purchase failed: ${error.response?.data?.response || error.message}`);
    }
  }

  /**
   * Convert airtime to cash
   */
  async convertAirtimeToCash(phoneNumber, network, amount) {
    try {
      const networkCode = this.getNetworkCode(network);
      const reference = this.generateReference('A2C');

      const response = await axios.post(
        this.baseUrl,
        {
          Action: 'A2C',
          Service: networkCode,
          Amount: amount.toString(),
          Number: phoneNumber,
          Ref: reference
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`A2C conversion failed: ${error.response?.data?.response || error.message}`);
    }
  }

  /**
   * Find specific data plan
   */
  async findDataPlan(network, bundle) {
    try {
      const plans = await this.getDataPlans(network);
      
      const plan = plans.find(p => p.name === bundle);

      if (!plan) {
        throw new Error(`Plan not found for ${network} - ${bundle}`);
      }

      return plan;
    } catch (error) {
      throw new Error(`Failed to find data plan: ${error.message}`);
    }
  }
}

module.exports = TranzitPayService;