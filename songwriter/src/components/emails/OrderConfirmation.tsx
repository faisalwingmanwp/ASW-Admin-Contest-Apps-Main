import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Img,
} from '@react-email/components';

export interface OrderConfirmationProps {
  contestantName: string;
  email: string;
  entries: {
    songTitle: string;
    category: string;
    price: number; // in cents
  }[];
  orderId: string;
  subtotal: number; // in cents
  tax: number; // in cents
  total: number; // in cents
  competitionName?: string;
}

export default function OrderConfirmation({
  contestantName,
  email,
  entries,
  orderId,
  subtotal,
  tax,
  total,
  competitionName,
}: OrderConfirmationProps) {
  
  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Html>
      <Head />
      <Preview>Contest Entry Confirmed</Preview>
      <Body style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        margin: '0',
        padding: '0',
        backgroundColor: '#f5f5f5',
        lineHeight: '1.6'
      }}>
        <Container style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff'
        }}>
          {/* Red Header with Logo */}
          <div style={{
            backgroundColor: '#D33F49',
            padding: '30px',
            textAlign: 'center'
          }}>
            <Img
              src="https://mxvziwxulybtcopysxow.supabase.co/storage/v1/object/public/profile-photos/songwriter-logo-black.webp"
              alt="American Songwriter"
              style={{
                maxWidth: '200px',
                height: 'auto',
              }}
            />
          </div>
          
          {/* Main Content */}
          <div style={{ padding: '40px 30px' }}>
            {/* Success Icon */}
            <div style={{
              textAlign: 'center',
              marginBottom: '30px'
            }}>
              <div style={{
                display: 'inline-block',
                width: '60px',
                height: '60px',
                backgroundColor: '#d4edda',
                borderRadius: '50%',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  width: '30px',
                  height: '30px',
                  backgroundColor: '#28a745',
                  borderRadius: '50%',
                  textAlign: 'center',
                  lineHeight: '30px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
              </div>
            </div>
            
            <Heading style={{
              textAlign: 'center',
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '20px'
            }}>
              Contest Entry Confirmed
            </Heading>
            
            <Text style={{
              textAlign: 'center',
              fontSize: '16px',
              color: '#666',
              marginBottom: '40px'
            }}>
              Thank you for entering {competitionName || 'the American Songwriter Contest'}! Your order has been successfully processed and your songs are officially entered.
            </Text>
            
            {/* Order Information */}
            <div style={{ marginBottom: '40px' }}>
              <Heading style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '16px'
              }}>
                Order Information
              </Heading>
              
              <Text style={{
                fontSize: '14px',
                color: '#666',
                margin: '8px 0'
              }}>
                Order #: <span style={{ fontWeight: '600', color: '#333' }}>{orderId}</span>
              </Text>
              
              <Text style={{
                fontSize: '14px',
                color: '#666',
                margin: '8px 0'
              }}>
                📅 Date: <span style={{ fontWeight: '600', color: '#333' }}>{currentDate}</span>
              </Text>
            </div>
            
            {/* Order Summary */}
            <div style={{ marginBottom: '40px' }}>
              <Heading style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '20px'
              }}>
                Order Summary
              </Heading>
              
              {entries.map((entry, index) => (
                <div key={index} style={{
                  borderBottom: '1px solid #eee',
                  paddingBottom: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <Text style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      margin: '0'
                    }}>
                      {entry.songTitle}
                    </Text>
                    <Text style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333',
                      margin: '0'
                    }}>
                      ${(entry.price / 100).toFixed(2)}
                    </Text>
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{
                      fontSize: '14px',
                      color: '#666',
                      margin: '0 0 8px 0'
                    }}>
                      Categories:
                    </Text>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#f0f0f0',
                      color: '#666',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {entry.category}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Totals */}
              <div style={{
                borderTop: '2px solid #eee',
                paddingTop: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <Text style={{
                    fontSize: '16px',
                    color: '#666',
                    margin: '0'
                  }}>
                    Subtotal
                  </Text>
                  <Text style={{
                    fontSize: '16px',
                    color: '#666',
                    margin: '0'
                  }}>
                    ${(subtotal / 100).toFixed(2)}
                  </Text>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <Text style={{
                    fontSize: '16px',
                    color: '#666',
                    margin: '0'
                  }}>
                    Tax
                  </Text>
                  <Text style={{
                    fontSize: '16px',
                    color: '#666',
                    margin: '0'
                  }}>
                    ${(tax / 100).toFixed(2)}
                  </Text>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #eee',
                  paddingTop: '12px'
                }}>
                  <Text style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#333',
                    margin: '0'
                  }}>
                    Total
                  </Text>
                  <Text style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#333',
                    margin: '0'
                  }}>
                    ${(total / 100).toFixed(2)}
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Need Help Section */}
            <div style={{
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              <Heading style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '12px'
              }}>
                Need Help?
              </Heading>
              
              <Text style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '16px'
              }}>
                Our support team is here to help you with any questions about your order.
              </Text>
              
              <Link
                href="mailto:info@americansongwriter.com"
                style={{
                  color: '#D33F49',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                📧 info@americansongwriter.com
              </Link>
            </div>
          </div>
          
          {/* Dark Footer */}
          <div style={{
            backgroundColor: '#2c3e50',
            color: '#ffffff',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <Text style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#2c3e50',
                  margin: '0'
                }}>
                  AS
                </Text>
              </div>
              <Text style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#ffffff',
                margin: '0'
              }}>
                American Songwriter
              </Text>
            </div>
            
            <Text style={{
              fontSize: '14px',
              color: '#bdc3c7',
              margin: '8px 0'
            }}>
              📍 1402 3rd Ave N. Nashville, TN 37208
            </Text>
            
            <Text style={{
              fontSize: '14px',
              color: '#bdc3c7',
              margin: '8px 0'
            }}>
              📧 info@americansongwriter.com
            </Text>
            
            <div style={{
              borderTop: '1px solid #34495e',
              paddingTop: '20px',
              marginTop: '20px'
            }}>
              <Text style={{
                fontSize: '12px',
                color: '#95a5a6',
                margin: '4px 0'
              }}>
                © 2025 American Songwriter. All rights reserved.
              </Text>
              <Text style={{
                fontSize: '12px',
                color: '#95a5a6',
                margin: '4px 0'
              }}>
                This email confirms your purchase. No official receipt without.
              </Text>
            </div>
          </div>
        </Container>
      </Body>
    </Html>
  );
} 