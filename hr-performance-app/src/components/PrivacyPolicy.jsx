import { useLanguage } from '../contexts/LanguageContext';
import './PrivacyPolicy.css';

export function PrivacyPolicy({ onBack }) {
  const { t, language } = useLanguage();

  const content = {
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: December 2025',
      backButton: '← Back to Application',
      sections: [
        {
          title: '1. Introduction',
          content: 'This Privacy Policy explains how the TSS PPM Generator ("the Application") handles your data. We are committed to protecting your privacy and being transparent about our data practices.'
        },
        {
          title: '2. Data Storage',
          subsections: [
            {
              subtitle: 'Local Browser Storage',
              content: 'All your performance review data is stored exclusively in your web browser\'s localStorage. This means:',
              list: [
                'Your data never leaves your device',
                'Data is not transmitted to any server',
                'Data is not shared with third parties',
                'Only you have access to your data on your specific browser and device'
              ]
            },
            {
              subtitle: 'Data Encryption',
              content: 'Please note that browser localStorage is NOT encrypted. Your data is stored in plain text on your device. While this data is only accessible through your browser, anyone with physical access to your device could potentially view this data. We recommend:',
              list: [
                'Using device-level encryption (BitLocker, FileVault)',
                'Not using the application on shared or public computers',
                'Clearing your browser data when finished if using a shared device'
              ]
            },
            {
              subtitle: 'Data Retention',
              content: 'Session data is automatically deleted after 14 days of inactivity. You can also manually clear your session at any time using the "Clear Session" button. Clearing your browser cache or localStorage will permanently delete all saved forms.'
            }
          ]
        },
        {
          title: '3. Session Codes',
          content: 'Session codes are randomly generated 10-character alphanumeric strings used to identify your session. These codes:',
          list: [
            'Are generated locally in your browser',
            'Are not stored on any server',
            'Can only be used to access data on the same browser and device where they were created',
            'Cannot be used to transfer data between browsers or devices'
          ]
        },
        {
          title: '4. Voice Input (Speech-to-Text)',
          content: 'If you use the voice input feature, your speech is processed using your browser\'s built-in Web Speech API or a local Whisper server. When using the browser\'s Web Speech API, your audio may be sent to the browser vendor\'s servers (e.g., Google for Chrome) for processing. The local Whisper server processes audio entirely on-premises without sending data to external services.'
        },
        {
          title: '5. Analytics',
          content: 'We use Plausible Analytics to collect anonymous usage statistics. Plausible is a privacy-friendly analytics service that:',
          list: [
            'Does NOT use cookies',
            'Does NOT collect personal data',
            'Does NOT track users across websites',
            'Is fully GDPR, CCPA, and PECR compliant',
            'Only collects aggregate data such as page views, referrer sources, and browser types'
          ],
          footer: 'You can learn more about Plausible\'s privacy practices at plausible.io/privacy-focused-web-analytics'
        },
        {
          title: '6. Data Export',
          content: 'When you download a report (DOCX file), this file is generated entirely in your browser and saved directly to your device. No data is uploaded to any server during this process.'
        },
        {
          title: '7. Third-Party Services',
          content: 'The Application does not integrate with any third-party services that would have access to your performance review data. The only external service used is Plausible Analytics, which collects only anonymous, aggregated usage data as described above.'
        },
        {
          title: '8. Your Rights',
          content: 'Since all data is stored locally on your device, you have complete control over your data. You can:',
          list: [
            'View all stored data through your browser\'s developer tools',
            'Delete your data at any time by clearing your browser\'s localStorage',
            'Export your data via the DOCX download feature',
            'Use browser privacy/incognito mode for sessions that leave no trace'
          ]
        },
        {
          title: '9. Changes to This Policy',
          content: 'We may update this Privacy Policy from time to time. Any changes will be reflected in the "Last updated" date at the top of this page.'
        },
        {
          title: '10. Contact',
          content: 'If you have questions about this Privacy Policy or the Application\'s data practices, please visit our GitHub repository or contact the development team through the appropriate channels.'
        }
      ]
    },
    nl: {
      title: 'Privacybeleid',
      lastUpdated: 'Laatst bijgewerkt: december 2025',
      backButton: '← Terug naar applicatie',
      sections: [
        {
          title: '1. Inleiding',
          content: 'Dit Privacybeleid legt uit hoe de TSS PPM Generator ("de Applicatie") met uw gegevens omgaat. Wij zijn toegewijd aan het beschermen van uw privacy en transparant zijn over onze gegevenspraktijken.'
        },
        {
          title: '2. Gegevensopslag',
          subsections: [
            {
              subtitle: 'Lokale browseropslag',
              content: 'Al uw beoordelingsgegevens worden uitsluitend opgeslagen in de localStorage van uw webbrowser. Dit betekent:',
              list: [
                'Uw gegevens verlaten nooit uw apparaat',
                'Gegevens worden niet naar een server verzonden',
                'Gegevens worden niet gedeeld met derden',
                'Alleen u heeft toegang tot uw gegevens op uw specifieke browser en apparaat'
              ]
            },
            {
              subtitle: 'Gegevensversleuteling',
              content: 'Let op: browser localStorage is NIET versleuteld. Uw gegevens worden in platte tekst op uw apparaat opgeslagen. Hoewel deze gegevens alleen toegankelijk zijn via uw browser, kan iemand met fysieke toegang tot uw apparaat deze gegevens mogelijk bekijken. Wij raden aan:',
              list: [
                'Gebruik apparaat-niveau versleuteling (BitLocker, FileVault)',
                'Gebruik de applicatie niet op gedeelde of openbare computers',
                'Wis uw browsergegevens wanneer u klaar bent als u een gedeeld apparaat gebruikt'
              ]
            },
            {
              subtitle: 'Gegevensretentie',
              content: 'Sessiegegevens worden automatisch verwijderd na 14 dagen inactiviteit. U kunt uw sessie ook handmatig wissen met de knop "Sessie wissen". Het wissen van uw browsercache of localStorage verwijdert permanent alle opgeslagen formulieren.'
            }
          ]
        },
        {
          title: '3. Sessiecodes',
          content: 'Sessiecodes zijn willekeurig gegenereerde alfanumerieke strings van 10 tekens die worden gebruikt om uw sessie te identificeren. Deze codes:',
          list: [
            'Worden lokaal in uw browser gegenereerd',
            'Worden niet op een server opgeslagen',
            'Kunnen alleen worden gebruikt om gegevens te openen op dezelfde browser en hetzelfde apparaat waar ze zijn aangemaakt',
            'Kunnen niet worden gebruikt om gegevens tussen browsers of apparaten over te dragen'
          ]
        },
        {
          title: '4. Spraakinvoer (Spraak-naar-tekst)',
          content: 'Als u de spraakinvoerfunctie gebruikt, wordt uw spraak verwerkt met behulp van de ingebouwde Web Speech API van uw browser of een lokale Whisper-server. Bij gebruik van de Web Speech API van de browser kan uw audio naar de servers van de browserleverancier worden gestuurd (bijv. Google voor Chrome) voor verwerking. De lokale Whisper-server verwerkt audio volledig on-premises zonder gegevens naar externe diensten te sturen.'
        },
        {
          title: '5. Analytics',
          content: 'We gebruiken Plausible Analytics om anonieme gebruiksstatistieken te verzamelen. Plausible is een privacyvriendelijke analysedienst die:',
          list: [
            'GEEN cookies gebruikt',
            'GEEN persoonlijke gegevens verzamelt',
            'Gebruikers NIET volgt over websites',
            'Volledig AVG, CCPA en PECR compliant is',
            'Alleen geaggregeerde gegevens verzamelt zoals paginaweergaven, verwijzingsbronnen en browsertypes'
          ],
          footer: 'U kunt meer leren over Plausible\'s privacypraktijken op plausible.io/privacy-focused-web-analytics'
        },
        {
          title: '6. Gegevensexport',
          content: 'Wanneer u een rapport downloadt (DOCX-bestand), wordt dit bestand volledig in uw browser gegenereerd en direct op uw apparaat opgeslagen. Er worden geen gegevens naar een server geüpload tijdens dit proces.'
        },
        {
          title: '7. Diensten van derden',
          content: 'De Applicatie integreert niet met diensten van derden die toegang zouden hebben tot uw beoordelingsgegevens. De enige externe dienst die wordt gebruikt is Plausible Analytics, die alleen anonieme, geaggregeerde gebruiksgegevens verzamelt zoals hierboven beschreven.'
        },
        {
          title: '8. Uw rechten',
          content: 'Aangezien alle gegevens lokaal op uw apparaat worden opgeslagen, heeft u volledige controle over uw gegevens. U kunt:',
          list: [
            'Alle opgeslagen gegevens bekijken via de ontwikkelaarstools van uw browser',
            'Uw gegevens op elk moment verwijderen door de localStorage van uw browser te wissen',
            'Uw gegevens exporteren via de DOCX-downloadfunctie',
            'Browser privacy/incognito modus gebruiken voor sessies die geen sporen achterlaten'
          ]
        },
        {
          title: '9. Wijzigingen in dit beleid',
          content: 'We kunnen dit Privacybeleid van tijd tot tijd bijwerken. Eventuele wijzigingen worden weergegeven in de "Laatst bijgewerkt" datum bovenaan deze pagina.'
        },
        {
          title: '10. Contact',
          content: 'Als u vragen heeft over dit Privacybeleid of de gegevenspraktijken van de Applicatie, bezoek dan onze GitHub-repository of neem contact op met het ontwikkelteam via de juiste kanalen.'
        }
      ]
    },
    es: {
      title: 'Política de Privacidad',
      lastUpdated: 'Última actualización: diciembre 2025',
      backButton: '← Volver a la aplicación',
      sections: [
        {
          title: '1. Introducción',
          content: 'Esta Política de Privacidad explica cómo el Generador TSS PPM ("la Aplicación") maneja sus datos. Estamos comprometidos a proteger su privacidad y ser transparentes sobre nuestras prácticas de datos.'
        },
        {
          title: '2. Almacenamiento de datos',
          subsections: [
            {
              subtitle: 'Almacenamiento local del navegador',
              content: 'Todos sus datos de evaluación de desempeño se almacenan exclusivamente en el localStorage de su navegador web. Esto significa:',
              list: [
                'Sus datos nunca salen de su dispositivo',
                'Los datos no se transmiten a ningún servidor',
                'Los datos no se comparten con terceros',
                'Solo usted tiene acceso a sus datos en su navegador y dispositivo específicos'
              ]
            },
            {
              subtitle: 'Cifrado de datos',
              content: 'Tenga en cuenta que el localStorage del navegador NO está cifrado. Sus datos se almacenan en texto plano en su dispositivo. Aunque estos datos solo son accesibles a través de su navegador, cualquier persona con acceso físico a su dispositivo podría ver estos datos. Recomendamos:',
              list: [
                'Usar cifrado a nivel de dispositivo (BitLocker, FileVault)',
                'No usar la aplicación en computadoras compartidas o públicas',
                'Borrar los datos de su navegador cuando termine si usa un dispositivo compartido'
              ]
            },
            {
              subtitle: 'Retención de datos',
              content: 'Los datos de la sesión se eliminan automáticamente después de 14 días de inactividad. También puede borrar manualmente su sesión en cualquier momento usando el botón "Limpiar sesión". Borrar la caché del navegador o localStorage eliminará permanentemente todos los formularios guardados.'
            }
          ]
        },
        {
          title: '3. Códigos de sesión',
          content: 'Los códigos de sesión son cadenas alfanuméricas de 10 caracteres generadas aleatoriamente que se utilizan para identificar su sesión. Estos códigos:',
          list: [
            'Se generan localmente en su navegador',
            'No se almacenan en ningún servidor',
            'Solo se pueden usar para acceder a datos en el mismo navegador y dispositivo donde se crearon',
            'No se pueden usar para transferir datos entre navegadores o dispositivos'
          ]
        },
        {
          title: '4. Entrada de voz (Voz a texto)',
          content: 'Si utiliza la función de entrada de voz, su voz se procesa utilizando la API Web Speech integrada de su navegador o un servidor Whisper local. Al usar la API Web Speech del navegador, su audio puede enviarse a los servidores del proveedor del navegador (por ejemplo, Google para Chrome) para su procesamiento. El servidor Whisper local procesa el audio completamente en las instalaciones sin enviar datos a servicios externos.'
        },
        {
          title: '5. Análisis',
          content: 'Utilizamos Plausible Analytics para recopilar estadísticas de uso anónimas. Plausible es un servicio de análisis respetuoso con la privacidad que:',
          list: [
            'NO utiliza cookies',
            'NO recopila datos personales',
            'NO rastrea usuarios entre sitios web',
            'Es totalmente compatible con GDPR, CCPA y PECR',
            'Solo recopila datos agregados como vistas de página, fuentes de referencia y tipos de navegador'
          ],
          footer: 'Puede obtener más información sobre las prácticas de privacidad de Plausible en plausible.io/privacy-focused-web-analytics'
        },
        {
          title: '6. Exportación de datos',
          content: 'Cuando descarga un informe (archivo DOCX), este archivo se genera completamente en su navegador y se guarda directamente en su dispositivo. No se cargan datos a ningún servidor durante este proceso.'
        },
        {
          title: '7. Servicios de terceros',
          content: 'La Aplicación no se integra con ningún servicio de terceros que tenga acceso a sus datos de evaluación de desempeño. El único servicio externo utilizado es Plausible Analytics, que solo recopila datos de uso anónimos y agregados como se describe anteriormente.'
        },
        {
          title: '8. Sus derechos',
          content: 'Dado que todos los datos se almacenan localmente en su dispositivo, usted tiene control total sobre sus datos. Puede:',
          list: [
            'Ver todos los datos almacenados a través de las herramientas de desarrollador de su navegador',
            'Eliminar sus datos en cualquier momento borrando el localStorage de su navegador',
            'Exportar sus datos a través de la función de descarga DOCX',
            'Usar el modo privado/incógnito del navegador para sesiones que no dejen rastro'
          ]
        },
        {
          title: '9. Cambios en esta política',
          content: 'Podemos actualizar esta Política de Privacidad de vez en cuando. Cualquier cambio se reflejará en la fecha "Última actualización" en la parte superior de esta página.'
        },
        {
          title: '10. Contacto',
          content: 'Si tiene preguntas sobre esta Política de Privacidad o las prácticas de datos de la Aplicación, visite nuestro repositorio de GitHub o contacte al equipo de desarrollo a través de los canales apropiados.'
        }
      ]
    }
  };

  const c = content[language] || content.en;

  return (
    <div className="privacy-policy">
      <div className="privacy-header">
        <button className="back-button" onClick={onBack}>
          {c.backButton}
        </button>
        <h1>{c.title}</h1>
        <p className="last-updated">{c.lastUpdated}</p>
      </div>

      <div className="privacy-content">
        {c.sections.map((section, idx) => (
          <div key={idx} className="privacy-section">
            <h2>{section.title}</h2>
            {section.content && <p>{section.content}</p>}

            {section.subsections && section.subsections.map((sub, subIdx) => (
              <div key={subIdx} className="privacy-subsection">
                <h3>{sub.subtitle}</h3>
                <p>{sub.content}</p>
                {sub.list && (
                  <ul>
                    {sub.list.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {section.list && (
              <ul>
                {section.list.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ul>
            )}

            {section.footer && <p className="section-footer">{section.footer}</p>}
          </div>
        ))}
      </div>

      <footer className="app-footer">
        <span className="app-footer-ai">🤖 Made with AI assistance</span>
        <a
          href="https://github.com/SimonvanAs/tss_ppm"
          target="_blank"
          rel="noopener noreferrer"
          className="app-footer-link"
        >
          View source code on GitHub
        </a>
      </footer>
    </div>
  );
}
