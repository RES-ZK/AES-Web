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
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';

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
  
  const { t } = useTranslation('common');
  const router = useRouter();

  const signer = useEthersSigner()

  useEffect(() => {
    aesInstant.updateWalletAddrOrPassword(walletAddr, password)
  }, [password])


  watchAccount(config, {
    onChange(account) {
      const { address } = account
      aesInstant.updateWalletAddrOrPassword(address, password)

      setWalletAddr(address)
    },
  })


  async function fetchEvents() {
    setIsLoadingHistory(true);
    
    try {
      await eventListener.history();
      const events: any = eventListener.getEvents();
      setEvents(events);
    } catch (error) {

      toast.error(t('toastError'), {
        position: "top-center",
        autoClose: 3000
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function handleEvent(newEvent: any) {
    setEvents((prevEvents: any[]) => {
      const newEvents = [...prevEvents, newEvent];
      return newEvents;
    });
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
          <h1 className={styles.title}>{t('title')}</h1>
          <div className={styles.headerControls}>
            <div className={styles.languageSelector}>
              <select 
                value={router.locale} 
                onChange={(e) => {
                  const locale = e.target.value;
                  router.push(router.pathname, router.asPath, { locale });
                }}
                className={styles.languageSelect}
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <ConnectButton />
          </div>
        </div>
        
        <p className={styles.subtitle}>
        {t('subtitle')}
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('walletConfig')}</h2>
          <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', color: '#555555'}}>{t('walletConfigDesc')}</p>
          
          <div className={styles.inputGroup} style={{marginBottom: '0.5rem'}}>
            <span className={styles.label}>{t('walletAddress')}</span>
            <div className={styles.walletInfo}>
              <span className={styles.infoValue}>{walletAddr || t('notConnected')}</span>
            </div>
          </div>
          
          <div className={styles.inputGroup} style={{marginBottom: '0.5rem'}}>
            <span className={styles.label}>{t('encryptionKey')}</span>
            <input 
              type="password" 
              className={styles.input} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={t('encryptionKeyPlaceholder')}
            />
            <div style={{fontSize: '0.75rem', color: '#666666', marginTop: '0.25rem'}}>
              {t('encryptionKeyDesc')}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('messageEncryption')}</h2>
          <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', color: '#555555'}}>{t('messageEncryptionDesc')}</p>
          
          <div className={styles.inputGroup} style={{marginBottom: '0.5rem'}}>
            <span className={styles.label}>{t('message')}</span>
            <input 
              type="text" 
              className={styles.input} 
              value={encodeText} 
              onChange={(e) => setEncodeText(e.target.value)} 
              placeholder={t('messagePlaceholder')}
            />
          </div>
          
          <button 
            className={styles.button} 
            onClick={async () => {
              if (!walletAddr) {
                toast.warning(t('toastConnectWallet'), {
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
                toast.warning(t('toastEnterMessage'), {
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
                
                const tx = await eventListener?.contract?.connect(signer as any).encodeString(encoded);
                
                toast.success(t('toastSuccess'), {
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
            {t('encryptButton')}
          </button>
        </section>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('messageHistory')}</h2>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p style={{fontSize: '0.9rem', marginBottom: '0.5rem', color: '#555555'}}>{t('messageHistoryDesc')}</p>
            <button 
              className={styles.refreshButton} 
              onClick={fetchEvents} 
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? t('loading') : t('refreshHistory')}
            </button>
          </div>
          
          <div className={styles.controlGroup}>
            <label className={styles.checkbox}>
              <input 
                type="checkbox" 
                checked={filterByCurrentAddress} 
                onChange={(e) => setFilterByCurrentAddress(e.target.checked)} 
              />
              <span>{t('filterMessages')}</span>
            </label>
          </div>
          
          {isLoadingHistory ? (
            <div style={{textAlign: 'center', padding: '1rem', color: '#333333', fontSize: '0.9rem'}}>
              <div style={{marginBottom: '0.5rem'}}>{t('loadingHistory')}</div>
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
              {t('noMessagesFound')}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('block')}</th>
                  <th>{t('transactionHash')}</th>
                  <th>{t('sender')}</th>
                  <th>{t('encryptedMessage')}</th>
                  <th>{t('timestamp')}</th>
                  <th>{t('decryptedMessage')}</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .sort((a, b) => b.blockNumber - a.blockNumber) // Sort by block number in descending order
                  .filter(event => !filterByCurrentAddress || (event.user.toLowerCase() === walletAddr?.toLowerCase()))
                  .map((event: any) => (
                    <tr key={event.transactionHash}>
                      <td>{event.blockNumber}</td>
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
                      <td>{event.user.substring(0, 6)}...{event.user.substring(event.user.length - 4)}</td>
                      <td>{event.encodedString.substring(0, 16)}...</td>
                      <td>{ new Date(event.timestamp * 1000).toLocaleString()}</td>
                      <td 
                        className={styles.revealableCell}
                        onClick={() => {
                          // Check if encryption key is entered
                          if (!password) {
                            toast.warning(t('toastEnterPassword'), {
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
                        title={!password ? t('toastEnterPassword') : 
                               event.user.toLowerCase() !== walletAddr?.toLowerCase() ? t('accessDenied') : 
                               revealedMessages[event.transactionHash] ? t('hideMessage') : t('revealMessage')}
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

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default Home;