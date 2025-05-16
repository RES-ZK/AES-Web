"use client"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import EventListener from "../utils/events.js";
import { useEffect, useState } from 'react';
import AES from "../utils/aes.js";
import { watchAccount,writeContract  } from '@wagmi/core'
import { config } from '../wagmi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const aesInstant = new AES("", "")


import { providers } from 'ethers'
import { useMemo } from 'react'
import type { Account, Chain, Client, Transport } from 'viem'
import { Config, useConnectorClient } from 'wagmi'

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  const signer = provider.getSigner(account.address)
  return signer
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}

const Home: NextPage = () => {
  const eventListener = new EventListener();
  const [events, setEvents] = useState<any[]>([]);
  const [password, setPassword] = useState<string>("")
  const [walletAddr, setWalletAddr] = useState<any>("")
  const [encodeText, setEncodeText] = useState<string>("")
  const [filterByCurrentAddress, setFilterByCurrentAddress] = useState<boolean>(false)
  const [revealedMessages, setRevealedMessages] = useState<{[key: string]: boolean}>({})
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

  const signer = useEthersSigner()

  useEffect(() => {
    aesInstant.updateWalletAddrOrPassword(walletAddr, password)
  }, [password])


  watchAccount(config, {
    onChange(account) {
      const { address } = account
      aesInstant.updateWalletAddrOrPassword(address, password)

      setWalletAddr(address)
      console.log('Account changed!', account)
    },
  })


  async function fetchEvents() {
    setIsLoadingHistory(true);
    
    try {
      await eventListener.history();
      const events: any = eventListener.getEvents();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching blockchain history:', error);
      toast.error('Error fetching blockchain history', {
        position: "top-center",
        autoClose: 3000
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function handleEvent(newEvent: any) {
    console.log("events called", events);
    setEvents((prevEvents: any[]) => {
      const newEvents = [...prevEvents, newEvent];
      return newEvents;
    });

    console.log("events", events);
  }

  useEffect(() => {
    fetchEvents()
    eventListener.on(handleEvent)

    return () => {
      eventListener.stopListening();
    };
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>AES Blockchain Encryption</title>
        <meta
          content="Secure blockchain messaging with AES encryption"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>AES Encryption</h1>
          <ConnectButton />
        </div>
        
        <p className={styles.subtitle}>
          Securely encrypt and store messages on the Ethereum blockchain using advanced AES encryption technology.
          Connect your wallet to get started with decentralized secure communications.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Wallet Configuration</h2>
          <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', color: '#555555'}}>Configure your encryption settings by connecting your wallet and setting a secure password.</p>
          
          <div className={styles.inputGroup} style={{marginBottom: '0.5rem'}}>
            <span className={styles.label}>Wallet Address:</span>
            <div className={styles.walletInfo}>
              <span className={styles.infoValue}>{walletAddr || 'Not connected'}</span>
            </div>
          </div>
          
          <div className={styles.inputGroup} style={{marginBottom: '0.5rem'}}>
            <span className={styles.label}>Encryption Key:</span>
            <input 
              type="password" 
              className={styles.input} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your encryption password"
            />
            <div style={{fontSize: '0.75rem', color: '#666666', marginTop: '0.25rem'}}>
              This password is used as part of your encryption key. Keep it secure and do not share it.
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Message Encryption</h2>
          <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', color: '#555555'}}>Enter your message below to encrypt it and store it securely on the blockchain.</p>
          
          <div className={styles.inputGroup} style={{marginBottom: '0.5rem'}}>
            <span className={styles.label}>Message:</span>
            <input 
              type="text" 
              className={styles.input} 
              value={encodeText} 
              onChange={(e) => setEncodeText(e.target.value)} 
              placeholder="Enter your message to encrypt"
            />
          </div>
          
          <button 
            className={styles.button} 
            onClick={async () => {
              if (!walletAddr) {
                toast.warning('Please connect your wallet first', {
                  position: "top-center",
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true
                });
                return;
              }
              if (!encodeText) {
                toast.warning('Please enter a message to encrypt', {
                  position: "top-center",
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true
                });
                return;
              }
              
              try {
                const encoded = aesInstant.encrypt(encodeText);
                console.log("encoded", eventListener);
                
                const tx = await eventListener?.contract?.connect(signer as any).encodeString(encoded);
                console.log("encoded", encoded);
                
                toast.success('Message encrypted and transaction submitted!', {
                  position: "top-center",
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true
                });
                setEncodeText('');
                // Refresh events after a short delay
                setTimeout(() => {
                  fetchEvents();
                }, 5000);
              } catch (error) {
                console.error('Error:', error);
                toast.error('Error encrypting message. See console for details.', {
                  position: "top-center",
                  autoClose: 3000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true
                });
              }
            }}
          >
            Encrypt & Store on Blockchain
          </button>
        </section>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Blockchain Message History</h2>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', color: '#555555'}}>View your encrypted messages stored on the blockchain. Only you can decrypt messages encrypted with your key.</p>
            <button 
              onClick={fetchEvents} 
              disabled={isLoadingHistory}
              className={styles.refreshButton}
              title="Refresh blockchain history"
            >
              Refresh
            </button>
          </div>
          
          <div className={styles.filterCheckbox}>
            <label>
              <input 
                type="checkbox" 
                checked={filterByCurrentAddress} 
                onChange={() => setFilterByCurrentAddress(!filterByCurrentAddress)}
              />
              <span>Show only my transactions</span>
            </label>
          </div>
          
          {isLoadingHistory ? (
            <div style={{textAlign: 'center', padding: '1rem', color: '#333333', fontSize: '0.9rem'}}>
              <div style={{marginBottom: '0.5rem'}}>Fetching blockchain history...</div>
              <div style={{width: '100%', height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px', overflow: 'hidden'}}>
                <div 
                  style={{
                    width: '30%', 
                    height: '100%', 
                    backgroundColor: '#000000',
                    borderRadius: '2px',
                    animation: 'loading 1.5s infinite ease-in-out'
                  }}
                />
              </div>
              <style jsx>{`
                @keyframes loading {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(400%); }
                }
              `}</style>
            </div>
          ) : events.length === 0 ? (
            <div style={{textAlign: 'center', padding: '1rem', color: '#666666', fontSize: '0.9rem'}}>
              No encrypted messages found. Encrypt a message to see it here.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Block #</th>
                  <th>Sender</th>
                  <th>Transaction Hash</th>
                  <th>Encrypted Data</th>
                  <th>Timestamp</th>
                  <th>Decrypted Message</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .sort((a, b) => b.blockNumber - a.blockNumber) // Sort by block number in descending order
                  .filter(event => !filterByCurrentAddress || (event.user.toLowerCase() === walletAddr?.toLowerCase()))
                  .map((event: any) => (
                    <tr key={event.transactionHash}>
                      <td>{event.blockNumber}</td>
                      <td>{event.user.substring(0, 6)}...{event.user.substring(event.user.length - 4)}</td>
                      <td>
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${event.transactionHash}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{color: '#000000', textDecoration: 'none'}}
                        >
                          {event.transactionHash.substring(0, 8)}...{event.transactionHash.substring(event.transactionHash.length - 6)}
                        </a>
                      </td>
                      <td>{event.encodedString.substring(0, 16)}...</td>
                      <td>{ new Date(event.timestamp * 1000).toLocaleString()}</td>
                      <td 
                        className={styles.revealableCell}
                        onClick={() => {
                          // Check if encryption key is entered
                          if (!password) {
                            toast.warning('Please enter an Encryption Key to view decrypted messages', {
                              position: "top-center",
                              autoClose: 3000,
                              hideProgressBar: false,
                              closeOnClick: true,
                              pauseOnHover: true,
                              draggable: true
                            });
                            return;
                          }
                          
                          // Toggle message visibility
                          setRevealedMessages(prev => ({
                            ...prev,
                            [event.transactionHash]: !prev[event.transactionHash]
                          }));
                        }}
                        title={!password ? "Enter Encryption Key first" : 
                               event.user.toLowerCase() !== walletAddr?.toLowerCase() ? "Access Denied" : 
                               revealedMessages[event.transactionHash] ? "Click to hide message" : "Click to reveal message"}
                      >
                        {revealedMessages[event.transactionHash] ? 
                          (event.user.toLowerCase() === walletAddr?.toLowerCase() ? 
                            (aesInstant.decrypt(event.encodedString) || <span className={styles.accessDenied}>Password is wrong</span> ) : 
                            <span className={styles.accessDenied}>Access Denied</span>) : 
                          <span className={styles.hiddenMessage}>
                            {event.user.toLowerCase() !== walletAddr?.toLowerCase() ? 
                              <span className={styles.accessDenied}>Access Denied</span> : 
                              "••••••••••••••••"}
                          </span>
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="https://x.com/kasoqian_eth" rel="noopener noreferrer" target="_blank">
          Powered by Kasoqian
        </a>
      </footer>
      
      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Home;