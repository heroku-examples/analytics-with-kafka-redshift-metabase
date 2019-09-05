const config = {
  maxWait: 10,
  campaignVolumeMult: 1.5,
  maxSessions: 500,
  campaign: 'ae271515-3b71-4c02-88b1-a009fe34279e',
  startTime: '2018-09-02T05:00:00-07:00',
  endTime: '2018-09-03T00:00:00-07:00',
  campaignTime: '2018-09-02T04:10:00-07:00',
  primeUntil: '2018-09-02T07:00:00-07:00',
  campaignPercentage: 0.33,
  skipBatchEvents: true,
  mode: '',
  output: {
    type: 'kafka',
    topic:
      `${process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''}${
        process.env.KAFKA_TOPIC
      }` || 'ecommerce-logs',
    cmd_topic:
      `${process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''}${
        process.env.KAFKA_CMD_TOPIC
      }` || 'viz_cmds',
    weight_topic:
      `${process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''}${
        process.env.KAFKA_WEIGHT_TOPIC
      }` || 'weights',
    kafka: {
      connectionString: process.env.KAFKA_URL || 'kafka://localhost:9092',
      ssl: {
        cert: process.env.KAFKA_CLIENT_CERT || '',
        key: process.env.KAFKA_CLIENT_CERT_KEY || ''
      }
    }
  },
  badCategory: 'EKUX',
  scenarios: {
    new_console: {
      text:
        'Awesome! A new game console was released, and there’s plenty in stock!',
      weights: {
        EKUX: 40,
        '3W3U': 99,
        '6GF4': 12,
        '3RUM': 23,
        UZZA: 23,
        YRFF: 20,
        UGAH: 7
      },
      maxWait: 8
    },
    electronics_shortage: {
      text:
        'Oh, no! Shortages of electronic components leave manufacturers unable to fill current orders.',
      weights: {
        EKUX: 60,
        '3W3U': 0,
        '6GF4': 12,
        '3RUM': 30,
        UZZA: 75,
        YRFF: 93,
        UGAH: 30
      },
      maxWait: 15
    },
    first_of_spring: {
      text:
        'It’s the first day of spring! All lawn and garden items are on sale!',
      weights: {
        EKUX: 99,
        '3W3U': 30,
        '6GF4': 8,
        '3RUM': 40,
        UZZA: 22,
        YRFF: 12,
        UGAH: 70
      },
      maxWait: 7
    },
    social_traffic: {
      text:
        'One of this year’s biggest social media stars just posted a story that mentions the website!',
      weights: {
        EKUX: 1,
        '3W3U': 34,
        '6GF4': 22,
        '3RUM': 18,
        UZZA: 98,
        YRFF: 17,
        UGAH: 12
      },
      maxWait: 5
    },
    broken_cart: {
      text:
        'Oops…the support team is saying that the shopping cart is bugged. Some customers can’t complete their orders!',
      weights: {
        EKUX: 41,
        '3W3U': 4,
        '6GF4': 2,
        '3RUM': 22,
        UZZA: 15,
        YRFF: 87,
        UGAH: 12
      },
      maxWait: 30
    },
    good_weather: {
      text:
        'Put on your bathing suit and fire up the grill! Meteorologists unanimously predict that the upcoming summer will have “the best weather ever known” across the US!',
      weights: {
        EKUX: 90,
        '3W3U': 4,
        '6GF4': 95,
        '3RUM': 22,
        UZZA: 15,
        YRFF: 50,
        UGAH: 12
      },
      maxWait: 6
    }
  },
  categories: {
    EKUX: {
      name: 'Lawn & Garden',
      weight: 60
    },
    '3W3U': {
      name: 'Electronics',
      weight: 42
    },
    '6GF4': {
      name: 'Apparel',
      weight: 12
    },
    '3RUM': {
      name: 'Home Furnishing',
      weight: 30
    },
    UZZA: {
      name: 'Housewares',
      weight: 75
    },
    YRFF: {
      name: 'Toys',
      weight: 93
    },
    UGAH: {
      name: 'Books',
      weight: 7
    }
  },
  products: {
    'ACME-EKUX-3QVB4Z-5': {
      category: 'EKUX',
      weight: 60
    },
    'ACME-3W3U-4ZMVYU-5': {
      category: '3W3U',
      weight: 42
    },
    'ACME-EKUX-FVHVWJ-4': {
      category: 'EKUX',
      weight: 37
    },
    'ACME-3W3U-7NG2H4-4': {
      category: '3W3U',
      weight: 86
    },
    'ACME-6GF4-PQU4CH-4': {
      category: '6GF4',
      weight: 63
    },
    'ACME-3RUM-EUFQCU-6': {
      category: '3RUM',
      weight: 88
    },
    'ACME-6GF4-Y6DDZF-2': {
      category: '6GF4',
      weight: 13
    },
    'ACME-EKUX-ZEQZEK-5': {
      category: 'EKUX',
      weight: 72
    },
    'ACME-UZZA-BE3R8D-3': {
      category: 'UZZA',
      weight: 50
    },
    'ACME-YRFF-ZK9J4P-5': {
      category: 'YRFF',
      weight: 93
    },
    'ACME-3RUM-M2JKG8-2': {
      category: '3RUM',
      weight: 59
    },
    'ACME-3W3U-2BM7WW-2': {
      category: '3W3U',
      weight: 56
    },
    'ACME-UZZA-QERUJE-3': {
      category: 'UZZA',
      weight: 66
    },
    'ACME-UZZA-6ADNUG-4': {
      category: 'UZZA',
      weight: 62
    },
    'ACME-3W3U-JEYKYU-4': {
      category: '3W3U',
      weight: 75
    },
    'ACME-YRFF-HJ3C3B-5': {
      category: 'YRFF',
      weight: 73
    },
    'ACME-UZZA-V29XV7-1': {
      category: 'UZZA',
      weight: 22
    },
    'ACME-3W3U-D7QKU6-2': {
      category: '3W3U',
      weight: 66
    },
    'ACME-3RUM-C6C2W3-2': {
      category: '3RUM',
      weight: 61
    },
    'ACME-3W3U-6NQB6K-1': {
      category: '3W3U',
      weight: 12
    },
    'ACME-YRFF-N37Q46-3': {
      category: 'YRFF',
      weight: 59
    },
    'ACME-UGAH-PQXGWP-1': {
      category: 'UGAH',
      weight: 46
    },
    'ACME-UZZA-7MK77F-5': {
      category: 'UZZA',
      weight: 41
    },
    'ACME-UGAH-9ZMZD4-4': {
      category: 'UGAH',
      weight: 35
    },
    'ACME-UGAH-68GFY3-6': {
      category: 'UGAH',
      weight: 85
    },
    'ACME-3RUM-D9JGRE-1': {
      category: '3RUM',
      weight: 41
    },
    'ACME-3RUM-HJJCEB-6': {
      category: '3RUM',
      weight: 69
    },
    'ACME-YRFF-ZE2DYA-5': {
      category: 'YRFF',
      weight: 38
    },
    'ACME-6GF4-BZJUQR-5': {
      category: '6GF4',
      weight: 46
    },
    'ACME-3W3U-U6EDQN-6': {
      category: '3W3U',
      weight: 80
    },
    'ACME-3RUM-KBRUED-6': {
      category: '3RUM',
      weight: 24
    },
    'ACME-EKUX-KJ96RY-4': {
      category: 'EKUX',
      weight: 53
    },
    'ACME-YRFF-7Z2CMM-3': {
      category: 'YRFF',
      weight: 84
    },
    'ACME-EKUX-4VP6T3-6': {
      category: 'EKUX',
      weight: 96
    },
    'ACME-3W3U-6BHRU9-5': {
      category: '3W3U',
      weight: 21
    },
    'ACME-3RUM-U2ZVF8-6': {
      category: '3RUM',
      weight: 53
    },
    'ACME-UGAH-U3CKGP-5': {
      category: 'UGAH',
      weight: 51
    },
    'ACME-YRFF-H6UM69-6': {
      category: 'YRFF',
      weight: 82
    },
    'ACME-UZZA-ZWPN32-6': {
      category: 'UZZA',
      weight: 96
    },
    'ACME-UGAH-4FYFGT-2': {
      category: 'UGAH',
      weight: 75
    },
    'ACME-UGAH-77VDWK-6': {
      category: 'UGAH',
      weight: 84
    },
    'ACME-YRFF-QHNUNB-2': {
      category: 'YRFF',
      weight: 50
    },
    'ACME-YRFF-QZ8UYU-2': {
      category: 'YRFF',
      weight: 47
    },
    'ACME-UGAH-FRVM79-2': {
      category: 'UGAH',
      weight: 32
    },
    'ACME-YRFF-BP2GNY-6': {
      category: 'YRFF',
      weight: 97
    },
    'ACME-3W3U-2K6CME-5': {
      category: '3W3U',
      weight: 33
    },
    'ACME-YRFF-87WJBT-5': {
      category: 'YRFF',
      weight: 24
    },
    'ACME-UZZA-C8H43J-4': {
      category: 'UZZA',
      weight: 34
    },
    'ACME-YRFF-62YD64-2': {
      category: 'YRFF',
      weight: 83
    },
    'ACME-6GF4-PMQQQ7-4': {
      category: '6GF4',
      weight: 37
    },
    'ACME-UZZA-Q8QK74-5': {
      category: 'UZZA',
      weight: 32
    },
    'ACME-3W3U-X4BR8Q-4': {
      category: '3W3U',
      weight: 45
    },
    'ACME-UGAH-DGY378-6': {
      category: 'UGAH',
      weight: 34
    },
    'ACME-YRFF-NG7WZ6-2': {
      category: 'YRFF',
      weight: 25
    },
    'ACME-3RUM-WA3TER-3': {
      category: '3RUM',
      weight: 84
    },
    'ACME-6GF4-EZ3GN4-2': {
      category: '6GF4',
      weight: 30
    },
    'ACME-EKUX-BP7UJC-4': {
      category: 'EKUX',
      weight: 61
    },
    'ACME-3RUM-2KQGMG-5': {
      category: '3RUM',
      weight: 85
    },
    'ACME-EKUX-FUF7WD-2': {
      category: 'EKUX',
      weight: 45
    },
    'ACME-UZZA-W9MW22-6': {
      category: 'UZZA',
      weight: 13
    },
    'ACME-3W3U-R6WW38-2': {
      category: '3W3U',
      weight: 14
    },
    'ACME-6GF4-8U22B6-5': {
      category: '6GF4',
      weight: 97
    },
    'ACME-EKUX-YJ2D9C-4': {
      category: 'EKUX',
      weight: 60
    },
    'ACME-3W3U-H98YB9-6': {
      category: '3W3U',
      weight: 21
    },
    'ACME-EKUX-BQV2AX-4': {
      category: 'EKUX',
      weight: 79
    },
    'ACME-3RUM-4ZKH94-4': {
      category: '3RUM',
      weight: 89
    },
    'ACME-UZZA-3966GV-1': {
      category: 'UZZA',
      weight: 72
    },
    'ACME-3RUM-ZNGMPA-6': {
      category: '3RUM',
      weight: 78
    },
    'ACME-3RUM-AEB3CA-5': {
      category: '3RUM',
      weight: 12
    },
    'ACME-6GF4-EGHHYU-4': {
      category: '6GF4',
      weight: 25
    },
    'ACME-UZZA-AEV4DG-6': {
      category: 'UZZA',
      weight: 43
    },
    'ACME-3RUM-XJU2U4-2': {
      category: '3RUM',
      weight: 44
    }
  },
  volume: [
    0.25,
    0.1,
    0.1,
    0.25,
    0.5,
    0.95,
    0.99,
    0.9974,
    0.995,
    0.975,
    0.98,
    0.9949,
    0.985,
    0.98,
    0.985,
    0.985,
    0.99,
    0.9974,
    0.4,
    0.75,
    0.4,
    0.9955,
    0.95,
    0.6
  ]
}

module.exports = config
