'use client'
// Le moteur 3D et ses données (three.js, DOM, WebGL) n'existent que dans le navigateur : l'application n'est jamais rendue côté serveur.
import dynamic from 'next/dynamic'

const App = dynamic(() => import('@/components/App'), { ssr: false })

const ClientApp = () => <App />

export default ClientApp
