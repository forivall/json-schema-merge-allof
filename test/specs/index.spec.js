var chai = require('chai')
var _ = require('lodash')
var simplifier = require('../../src')
var $RefParser = require('json-schema-ref-parser')
var stringify = require('json-stringify-safe')

var expect = chai.expect

describe('module', function() {
  it('combines simple usecase', function() {
    var result = simplifier({
      allOf: [
        {
          type: 'text',
          minLength: 1
        }, {
          type: 'text',
          maxLength: 5
        }
      ]
    })

    expect(result).to.eql({type: 'text', minLength: 1, maxLength: 5})
  })

  it('combines without allOf', function() {
    var result = simplifier({
      properties: {
        foo: {
          type: 'string'
        }
      }
    })

    expect(result).to.eql({
      properties: {
        foo: {
          type: 'string'
        }
      }
    })
  })

  describe('simple resolve functionality', function() {
    it('merges with default resolver if not defined resolver', function() {
      var result = simplifier({
        title: 'schema1',
        allOf: [
          {
            title: 'schema2'
          }, {
            title: 'schema3'
          }
        ]
      })

      expect(result).to.eql({title: 'schema1'})

      var result3 = simplifier({
        allOf: [
          {
            title: 'schema2'
          }, {
            title: 'schema3'
          }
        ]
      })

      expect(result3).to.eql({title: 'schema2'})
    })

    it('merges minLength if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            minLength: 1
          }, {
            minLength: 5
          }
        ]
      })

      expect(result).to.eql({minLength: 5})
    })

    it('merges minimum if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            minimum: 1
          }, {
            minimum: 5
          }
        ]
      })

      expect(result).to.eql({minimum: 5})
    })

    it('merges exclusiveMinimum if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            exclusiveMinimum: 1
          }, {
            exclusiveMinimum: 5
          }
        ]
      })

      expect(result).to.eql({exclusiveMinimum: 5})
    })

    it('merges minItems if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            minItems: 1
          }, {
            minItems: 5
          }
        ]
      })

      expect(result).to.eql({minItems: 5})
    })

    it('merges maximum if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            maximum: 1
          }, {
            maximum: 5
          }
        ]
      })

      expect(result).to.eql({maximum: 1})
    })

    it('merges exclusiveMaximum if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            exclusiveMaximum: 1
          }, {
            exclusiveMaximum: 5
          }
        ]
      })

      expect(result).to.eql({exclusiveMaximum: 1})
    })

    it('merges maxItems if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            maxItems: 1
          }, {
            maxItems: 5
          }
        ]
      })

      expect(result).to.eql({maxItems: 1})
    })

    it('merges maxLength if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            maxLength: 4
          }, {
            maxLength: 5
          }
        ]
      })

      expect(result).to.eql({maxLength: 4})
    })

    it('merges uniqueItems to most restrictive if conflict', function() {
      var result = simplifier({
        allOf: [
          {
            uniqueItems: true
          }, {
            uniqueItems: false
          }
        ]
      })

      expect(result).to.eql({uniqueItems: true})

      expect(simplifier({
        allOf: [
          {
            uniqueItems: false
          }, {
            uniqueItems: false
          }
        ]
      })).to.eql({uniqueItems: false})
    })

    it('throws if merging incompatible type', function() {
      expect(function() {
        simplifier({
          allOf: [
            {
              type: 'null'
            }, {
              type: 'text'
            }
          ]
        })
      }).to.throw(/incompatible/)
    })

    it('merges type if conflict', function() {
      var result = simplifier({allOf: [
        {}, {
          type: ['string', 'null', 'object', 'array']
        }, {
          type: ['string', 'null']
        }, {
          type: ['null', 'string']
        }
      ]})

      expect(result).to.eql({
        type: ['string', 'null']
      })

      var result2 = simplifier({allOf: [
        {}, {
          type: ['string', 'null', 'object', 'array']
        }, {
          type: 'string'
        }, {
          type: ['null', 'string']
        }
      ]})

      expect(result2).to.eql({type: 'string'})

      expect(function() {
        simplifier({
          allOf: [
            {
              type: ['null']
            }, {
              type: ['text', 'object']
            }
          ]
        })
      }).to.throw(/incompatible/)
    })

    it('merges enum', function() {
      var result = simplifier({allOf: [
        {}, {
          enum: [
            'string',
            'null',
            'object',
            {},
            [2],
            [1],
            null
          ]
        }, {
          enum: ['string', {}, [1], [1]
          ]
        }, {
          enum: [
            'null',
            'string',
            {},
            [3],
            [1],
            null
          ]
        }
      ]})

      expect(result).to.eql({
        enum: [[1], {}, 'string']
      })
    })

    it('throws if enum is incompatible', function() {
      expect(function() {
        simplifier({allOf: [
          {}, {
            enum: ['string', {}]
          }, {
            enum: [{}, 'string']
          }
        ]})
      }).not.to.throw(/incompatible/)

      expect(function() {
        simplifier({allOf: [
          {}, {
            enum: ['string', {}]
          }, {
            enum: [[], false]
          }
        ]})
      }).to.throw(/incompatible/)
    })

    it('merges const', function() {
      var result = simplifier({allOf: [
        {}, {
          const: ['string', {}]
        }, {
          const: ['string', {}]
        }
      ]})

      expect(result).to.eql({
        const: ['string', {}]
      })
    })

    it('merges anyOf', function() {
      var result = simplifier({allOf: [
        {}, {
          anyOf: [
            {
              required: ['123']
            }
          ]
        }, {
          anyOf: [
            {
              required: ['123']
            }, {
              required: ['456']
            }
          ]
        }
      ]})

      expect(result).to.eql({
        allOf: [
          {
            anyOf: [
              {
                required: ['123']
              }
            ]
          }, {
            anyOf: [
              {
                required: ['123']
              }, {
                required: ['456']
              }
            ]
          }
        ]
      })
    })

    it('merges nested allOf if inside singular anyOf', function() {
      var result = simplifier({
        allOf: [
          {
            anyOf: [
              {
                required: ['123'],
                allOf: [{
                  required: ['768']
                }]
              }
            ]
          }, {
            anyOf: [
              {
                required: ['123']
              }, {
                required: ['456']
              }
            ]
          }
        ]
      })

      expect(result).to.eql({
        allOf: [
          {
            anyOf: [
              {
                required: ['123', '768']
              }
            ]
          }, {
            anyOf: [
              {
                required: ['123']
              }, {
                required: ['456']
              }
            ]
          }
        ]
      })
    })

    it('throws if no intersection', function() {
      expect(simplifier({
        allOf: [
          {
            type: 'array',
            anyOf: [
              {
                required: ['123']
              }
            ]
          }, {
            anyOf: [
              {
                required: ['456']
              }
            ]
          }
        ]
      })).to.eql({
        type: 'array',
        allOf: [
          {
            anyOf: [
              {
                required: ['123']
              }
            ]
          }, {
            anyOf: [
              {
                required: ['456']
              }
            ]
          }
        ]
      })
    })

    it('leaves oneOf as is if multiple', function() {
      var result = simplifier({allOf: [
        {}, {
          oneOf: [
            {
              required: ['123']
            }, {
              properties: {
                name: {
                  type: 'string'
                }
              }
            }, {
              required: ['abc']
            }
          ]
        }, {
          oneOf: [
            {
              required: ['123']
            }, {
              required: ['abc']
            }
          ]
        }
      ]})

      expect(result).to.eql({allOf: [
        {
          oneOf: [
            {
              required: ['123']
            }, {
              properties: {
                name: {
                  type: 'string'
                }
              }
            }, {
              required: ['abc']
            }
          ]
        }, {
          oneOf: [
            {
              required: ['123']
            }, {
              required: ['abc']
            }
          ]
        }
      ]})
    })

    it('merges nested allOf if inside singular oneOf', function() {
      var result = simplifier({
        allOf: [
          {
            type: ['array', 'string', 'number'],
            oneOf: [
              {
                required: ['123'],
                allOf: [{
                  required: ['768']
                }]
              }
            ]
          },
          {
            type: ['array', 'string']
          }
        ]
      })

      expect(result).to.eql({
        type: ['array', 'string'],
        oneOf: [
          {
            required: ['123', '768']
          }
        ]
      })
    })

    it('merges nested allOf if inside multiple oneOf', function() {
      var result = simplifier({
        allOf: [
          {
            type: ['array', 'string', 'number'],
            oneOf: [
              {
                required: ['123'],
                allOf: [{
                  required: ['768']
                }]
              }
            ]
          }, {
            type: ['array', 'string'],
            oneOf: [
              {
                required: ['123']
              }, {
                required: ['456']
              }
            ]
          }
        ]
      })

      expect(result).to.eql({
        type: ['array', 'string'],
        allOf: [
          {
            oneOf: [
              {
                required: ['123', '768']
              }
            ]
          }, {
            oneOf: [
              {
                required: ['123']
              }, {
                required: ['456']
              }
            ]
          }
        ]
      })
    })

    it.skip('throws if no compatible when merging oneOf', function() {
      expect(function() {
        simplifier({allOf: [
          {}, {
            oneOf: [
              {
                required: ['123']
              }
            ]
          }, {
            oneOf: [
              {
                required: ['fdasfd']
              }
            ]
          }
        ]})
      }).to.throw(/incompatible/)

      expect(function() {
        simplifier({allOf: [
          {}, {
            oneOf: [
              {
                required: ['123']
              }, {
                properties: {
                  name: {
                    type: 'string'
                  }
                }
              }
            ]
          }, {
            oneOf: [
              {
                required: ['fdasfd']
              }
            ]
          }
        ]})
      }).to.throw(/incompatible/)
    })

    // not ready to implement this yet
    it.skip('merges singular oneOf', function() {
      var result = simplifier({
        properties: {
          name: {
            type: 'string'
          }
        },
        allOf: [
          {
            properties: {
              name: {
                type: 'string',
                minLength: 10
              }
            }
          }, {
            oneOf: [
              {
                required: ['123']
              }, {
                properties: {
                  name: {
                    type: 'string',
                    minLength: 15
                  }
                }
              }
            ]
          }, {
            oneOf: [
              {
                required: ['abc']
              }, {
                properties: {
                  name: {
                    type: 'string',
                    minLength: 15
                  }
                }
              }
            ]
          }
        ]
      })

      expect(result).to.eql({
        properties: {
          name: {
            type: 'string',
            minLength: 15
          }
        }
      })
    })

    it('merges not using allOf', function() {
      var result = simplifier({allOf: [
        {}, {
          not: {
            properties: {
              name: {
                type: 'string',
                pattern: 'bar'
              }
            }
          }
        }, {
          not: {
            properties: {
              name: {
                type: 'string',
                pattern: 'foo'
              }
            }
          }
        }
      ]})

      expect(result).to.eql({
        not: {
          allOf: [
            {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'bar'
                }
              }
            }, {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'foo'
                }
              }
            }
          ]
        }
      })
    })

    it('merges contains using allOf', function() {
      var result = simplifier({allOf: [
        {}, {
          contains: {
            properties: {
              name: {
                type: 'string',
                pattern: 'bar'
              }
            }
          }
        }, {
          contains: {
            properties: {
              name: {
                type: 'string',
                pattern: 'foo'
              }
            }
          }
        }
      ]})

      expect(result).to.eql({
        contains: {
          allOf: [
            {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'bar'
                }
              }
            }, {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'foo'
                }
              }
            }
          ]
        }
      })
    })

    it('merges additionalItems using allOf', function() {
      var result = simplifier({allOf: [
        {}, {
          additionalItems: {
            properties: {
              name: {
                type: 'string',
                pattern: 'bar'
              }
            }
          }
        }, {
          additionalItems: {
            properties: {
              name: {
                type: 'string',
                pattern: 'foo'
              }
            }
          }
        }
      ]})

      expect(result).to.eql({
        additionalItems: {
          allOf: [
            {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'bar'
                }
              }
            }, {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'foo'
                }
              }
            }
          ]
        }
      })
    })

    it('merges pattern using allOf', function() {
      var result = simplifier({allOf: [
        {}, {
          pattern: 'fdsaf'
        }, {
          pattern: 'abba'
        }
      ]})

      expect(result).to.eql({
        allOf: [
          {
            pattern: 'fdsaf'
          }, {
            pattern: 'abba'
          }
        ]
      })

      var result2 = simplifier({
        allOf: [
          {
            pattern: 'abba'
          }
        ]
      })

      expect(result2).to.eql({pattern: 'abba'})
    })

    it.skip('merges multipleOf by finding common lowest number', function() {
      var result = simplifier({allOf: [
        {}, {
          multipleOf: 0.2,
          allOf: [
            {
              multipleOf: 2,
              allOf: [
                {
                  multipleOf: 2,
                  allOf: [
                    {
                      multipleOf: 2,
                      allOf: [
                        {
                          multipleOf: 3,
                          allOf: [
                            {
                              multipleOf: 1.5,
                              allOf: [
                                {
                                  multipleOf: 0.5
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }, {
          multipleOf: 0.3
        }
      ]})

      expect(result).to.eql({multipleOf: 54})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 4
          }, {
            multipleOf: 15
          }, {
            multipleOf: 3
          }
        ]
      })).to.eql({multipleOf: 60})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 0.3
          }, {
            multipleOf: 0.7
          }, {
            multipleOf: 1
          }
        ]
      })).to.eql({multipleOf: 2.1})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 0.5
          }, {
            multipleOf: 2
          }
        ]
      })).to.eql({multipleOf: 2})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 0.3
          }, {
            multipleOf: 0.5
          }, {
            multipleOf: 1
          }
        ]
      })).to.eql({multipleOf: 3})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 0.3
          }, {
            multipleOf: 0.7
          }, {
            multipleOf: 1
          }
        ]
      })).to.eql({multipleOf: 21})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 0.4
          }, {
            multipleOf: 0.7
          }, {
            multipleOf: 3
          }
        ]
      })).to.eql({multipleOf: 84})

      console.log(20 * 85 * 100 * 100)
      expect(simplifier({
        allOf: [
          {
            multipleOf: 0.2
          }, {
            multipleOf: 0.85
          }, {
            multipleOf: 1
          }
        ]
      })).to.eql({multipleOf: 84})

      expect(simplifier({
        allOf: [
          {
            multipleOf: 100000
          }, {
            multipleOf: 1000000
          }, {
            multipleOf: 500000
          }
        ]
      })).to.eql({multipleOf: 100000000000})
    })

    it.skip('merges multipleOf using allOf', function() {
      var result = simplifier({allOf: [
        {}, {
          multipleOf: 10
        }, {
          multipleOf: 20
        }
      ]})

      expect(result).to.eql({
        allOf: [
          {
            multipleOf: 10
          }, {
            multipleOf: 20
          }
        ]
      })

      var result2 = simplifier({
        allOf: [
          {
            multipleOf: 10
          }
        ]
      })

      expect(result2).to.eql({multipleOf: 10})
    })
  })

  describe('merging arrays', function() {
    it('merges required object', function() {
      expect(simplifier({
        required: ['prop2'],
        allOf: [
          {
            required: ['prop2', 'prop1']
          }
        ]
      })).to.eql({
        required: ['prop1', 'prop2']
      })
    })

    it('merges default value', function() {
      expect(simplifier({
        default: [
          'prop2', {
            prop1: 'foo'
          }
        ],
        allOf: [
          {
            default: ['prop2', 'prop1']
          }
        ]
      })).to.eql({
        default: [
          'prop2', {
            prop1: 'foo'
          }
        ]
      })
    })

    it('merges default value', function() {
      expect(simplifier({
        default: {
          foo: 'bar'
        },
        allOf: [
          {
            default: ['prop2', 'prop1']
          }
        ]
      })).to.eql({
        default: {
          foo: 'bar'
        }
      })
    })
  })

  describe('merging objects', function() {
    it('merges child objects', function() {
      expect(simplifier({
        properties: {
          name: {
            title: 'Name',
            type: 'string'
          }
        },
        allOf: [
          {
            properties: {
              name: {
                title: 'allof1',
                type: 'string'
              },
              added: {
                type: 'integer'
              }
            }
          }, {
            properties: {
              name: {
                type: 'string'
              }
            }
          }
        ]
      })).to.eql({
        properties: {
          name: {
            title: 'Name',
            type: 'string'
          },
          added: {
            type: 'integer'
          }
        }
      })
    })

    it('merges boolean schemas', function() {
      expect(simplifier({
        properties: {
          name: true
        },
        allOf: [
          {
            properties: {
              name: {
                title: 'allof1',
                type: 'string'
              },
              added: {
                type: 'integer'
              }
            }
          }, {
            properties: {
              name: {
                type: 'string',
                minLength: 5
              }
            }
          }
        ]
      })).to.eql({
        properties: {
          name: {
            title: 'allof1',
            type: 'string',
            minLength: 5
          },
          added: {
            type: 'integer'
          }
        }
      })

      expect(simplifier({
        properties: {
          name: false
        },
        allOf: [
          {
            properties: {
              name: {
                title: 'allof1',
                type: 'string'
              },
              added: {
                type: 'integer'
              }
            }
          }, {
            properties: {
              name: true
            }
          }
        ]
      })).to.eql({
        properties: {
          name: false,
          added: {
            type: 'integer'
          }
        }
      })

      expect(simplifier({
        allOf: [true, false]
      })).to.eql(false)

      expect(simplifier({
        properties: {
          name: true
        },
        allOf: [
          {
            properties: {
              name: false,
              added: {
                type: 'integer'
              }
            }
          }, {
            properties: {
              name: true
            }
          }
        ]
      })).to.eql({
        properties: {
          name: false,
          added: {
            type: 'integer'
          }
        }
      })
    })

    it('merges all allOf', function() {
      expect(simplifier({
        properties: {
          name: {
            allOf: [
              {
                pattern: '^.+$'
              }
            ]
          }
        },
        allOf: [
          {
            properties: {
              name: true,
              added: {
                type: 'integer',
                title: 'pri1',
                allOf: [
                  {
                    title: 'pri2',
                    type: [
                      'string', 'integer'
                    ],
                    minimum: 15,
                    maximum: 10
                  }
                ]
              }
            },
            allOf: [
              {
                properties: {
                  name: true,
                  added: {
                    type: 'integer',
                    minimum: 5
                  }
                },
                allOf: [
                  {
                    properties: {
                      added: {
                        title: 'pri3',
                        type: 'integer',
                        minimum: 10
                      }
                    }
                  }
                ]
              }
            ]
          }, {
            properties: {
              name: true,
              added: {
                minimum: 7
              }
            }
          }
        ]
      })).to.eql({
        properties: {
          name: {
            pattern: '^.+$'
          },
          added: {
            type: 'integer',
            title: 'pri1',
            minimum: 15,
            maximum: 10
          }
        }
      })
    })
  })

  describe('merging definitions', function() {
    it('merges circular', function() {
      var schema = {
        properties: {
          person: {
            properties: {
              name: {
                type: 'string',
                minLength: 8
              }
            },
            allOf: [
              {
                properties: {
                  name: {
                    minLength: 5,
                    maxLength: 10
                  }
                },
                allOf: [
                  {
                    properties: {
                      prop1: {
                        minLength: 7
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }

      schema.properties.person.properties.child = schema.properties.person

      var expected = {
        person: {
          properties: {
            name: {
              minLength: 8,
              maxLength: 10,
              type: 'string'
            },
            prop1: {
              minLength: 7
            }
          }
        }
      }

      expected.person.properties.child = expected.person

      var result = simplifier(schema)

      expect(result).to.eql({properties: expected})
    })

    it('merges any definitions and circular', function() {
      var schema = {
        properties: {
          person: {
            $ref: '#/definitions/person'
          }
        },
        definitions: {
          person: {
            properties: {
              name: {
                type: 'string',
                minLength: 8
              },
              child: {
                $ref: '#/definitions/person'
              }
            },
            allOf: [
              {
                properties: {
                  name: {
                    minLength: 5,
                    maxLength: 10
                  }
                },
                allOf: [
                  {
                    properties: {
                      prop1: {
                        minLength: 7
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }

      return $RefParser.dereference(schema).then(function(dereferenced) {
        var expected = {
          person: {
            properties: {
              name: {
                minLength: 8,
                maxLength: 10,
                type: 'string'
              },
              prop1: {
                minLength: 7
              }
            }
          }
        }

        expected.person.properties.child = expected.person

        var result = simplifier(schema)

        expect(result).to.eql({properties: expected, definitions: expected})

        expect(result).to.equal(dereferenced)

        expect(result.properties.person.properties.child).to.equal(result.definitions.person.properties.child)
        expect(result.properties.person.properties.child).to.equal(dereferenced.properties.person)
      })
    })
  })

  describe('additionalProperties', function() {
    it('throws if additionalProperties is false', function() {
      expect(function() {
        simplifier({
          allOf: [
            {
              additionalProperties: true
            }, {
              additionalProperties: false
            }
          ]
        })
      }).to.throw(/additionalProperties/)
    })

    it('does not throw if option combineAdditionalProperties is true', function() {
      var result
      expect(function() {
        result = simplifier({
          allOf: [
            {
              additionalProperties: true
            }, {
              additionalProperties: false
            }
          ]
        }, {combineAdditionalProperties: true})
      }).not.to.throw(/additionalProperties/)

      expect(result).to.eql({additionalProperties: false})

      var result2 = simplifier({
        allOf: [
          {
            additionalProperties: true
          }, {
            additionalProperties: true
          }
        ]
      })

      expect(result2).to.eql({additionalProperties: true})
    })

    it('combines additionalProperties when schemas', function() {
      var result = simplifier({
        additionalProperties: true,
        allOf: [
          {
            additionalProperties: {
              type: [
                'string', 'null'
              ],
              maxLength: 10
            }
          }, {
            additionalProperties: {
              type: [
                'string', 'integer', 'null'
              ],
              maxLength: 8
            }
          }
        ]
      })

      expect(result).to.eql({
        additionalProperties: {
          type: [
            'string', 'null'
          ],
          maxLength: 8
        }
      })
    })
  })

  describe('patternProperties', function() {
    it('merges simliar schemas', function() {
      var result = simplifier({
        patternProperties: {
          '^\\$.+': {
            type: [
              'string', 'null', 'integer'
            ],
            allOf: [
              {
                minimum: 5
              }
            ]
          }
        },
        allOf: [
          {
            patternProperties: {
              '^\\$.+': {
                type: [
                  'string', 'null'
                ],
                allOf: [
                  {
                    minimum: 7
                  }
                ]
              },
              '.*': {
                type: 'null'
              }
            }
          }
        ]
      })

      expect(result).to.eql({
        patternProperties: {
          '^\\$.+': {
            type: [
              'string', 'null'
            ],
            minimum: 7
          },
          '.*': {
            type: 'null'
          }
        }
      })
    })
  })

  describe('dependencies', function() {
    it('merges simliar schemas', function() {
      var result = simplifier({
        dependencies: {
          'foo': {
            type: [
              'string', 'null', 'integer'
            ],
            allOf: [
              {
                minimum: 5
              }
            ]
          },
          'bar': ['prop1', 'prop2']
        },
        allOf: [
          {
            dependencies: {
              'foo': {
                type: [
                  'string', 'null'
                ],
                allOf: [
                  {
                    minimum: 7
                  }
                ]
              },
              'bar': ['prop4']
            }
          }
        ]
      })

      expect(result).to.eql({
        dependencies: {
          'foo': {
            type: [
              'string', 'null'
            ],
            minimum: 7
          },
          'bar': ['prop1', 'prop2', 'prop4']
        }
      })
    })
  })

  describe('propertyNames', function() {
    it('merges simliar schemas', function() {
      var result = simplifier({
        propertyNames: {
          type: 'string',
          allOf: [
            {
              minLength: 5
            }
          ]
        },
        allOf: [
          {
            propertyNames: {
              type: 'string',
              pattern: 'abc.*',
              allOf: [
                {
                  maxLength: 7
                }
              ]
            }
          }
        ]
      })

      expect(result).to.eql({
        propertyNames: {
          type: 'string',
          pattern: 'abc.*',
          minLength: 5,
          maxLength: 7
        }
      })
    })
  })

  describe('items', function() {
    describe('when single schema', function() {
      it('merges them', function() {
        var result = simplifier({
          items: {
            type: 'string',
            allOf: [
              {
                minLength: 5
              }
            ]
          },
          allOf: [
            {
              items: {
                type: 'string',
                pattern: 'abc.*',
                allOf: [
                  {
                    maxLength: 7
                  }
                ]
              }
            }
          ]
        })

        expect(result).to.eql({
          items: {
            type: 'string',
            pattern: 'abc.*',
            minLength: 5,
            maxLength: 7
          }
        })
      })
    })

    describe('when array', function() {
      it('merges them if possible', function() {
        var result = simplifier({
          items: [
            {
              type: 'string',
              allOf: [
                {
                  minLength: 5
                }
              ]
            }
          ],
          allOf: [
            {
              items: [
                {
                  type: 'string',
                  allOf: [
                    {
                      minLength: 5
                    }
                  ]
                }, {
                  type: 'integer'
                }
              ]
            }
          ]
        })

        expect(result).to.eql({
          items: [
            {
              type: 'string',
              minLength: 5
            }, {
              type: 'integer'
            }
          ]
        })
      })
    })
  })

  describe('properties', function() {
    describe('when property name has same as a reserved word', function() {
      it('does not treat it as a reserved word')
    })
  })
})
