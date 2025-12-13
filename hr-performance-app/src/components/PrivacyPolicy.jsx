import { useLanguage } from '../contexts/LanguageContext';
import './PrivacyPolicy.css';

export function PrivacyPolicy({ onBack }) {
  const { t, language } = useLanguage();

  const content = {
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: December 2025 (v2.0)',
      backButton: '← Back to Application',
      sections: [
        {
          title: '1. Introduction',
          content: 'This Privacy Policy explains how the TSS Performance Management System ("the Application") handles your data. We are committed to protecting your privacy and being transparent about our data practices. This policy applies to version 2.0, which includes server-side data storage and authentication.'
        },
        {
          title: '2. Data We Collect',
          subsections: [
            {
              subtitle: 'Account Information',
              content: 'When you access the Application, the following account information is collected through your organization\'s identity provider (Microsoft Entra ID / Keycloak):',
              list: [
                'Email address',
                'Display name',
                'Employee ID (if provided by your organization)',
                'Organizational role and department',
                'Manager assignment'
              ]
            },
            {
              subtitle: 'Performance Review Data',
              content: 'The Application stores performance review information including:',
              list: [
                'Goals, objectives, and their scores',
                'Competency assessments and scores',
                'Self-assessments and manager comments',
                'Review cycle status and workflow history',
                'Signatures and acknowledgments',
                'Calibration session adjustments (for HR users)'
              ]
            },
            {
              subtitle: 'Usage and Audit Data',
              content: 'To ensure security and compliance, we log:',
              list: [
                'Login timestamps and session activity',
                'Changes made to reviews (audit trail)',
                'Calibration adjustments with justifications',
                'Administrative actions'
              ]
            }
          ]
        },
        {
          title: '3. How We Store Your Data',
          subsections: [
            {
              subtitle: 'Server-Side Storage',
              content: 'Your performance review data is stored securely on servers managed by your organization or Total Specific Solutions. This includes:',
              list: [
                'PostgreSQL database with encryption at rest',
                'Data is transmitted over HTTPS (TLS 1.2+)',
                'Regular automated backups',
                'Access controls based on your organizational role'
              ]
            },
            {
              subtitle: 'Multi-Tenant Architecture',
              content: 'The Application uses a multi-tenant architecture where each Operating Company (OpCo) has isolated data. Your data is only accessible to authorized users within your organization based on their role (Employee, Manager, HR, Admin).'
            },
            {
              subtitle: 'Local Browser Storage',
              content: 'Some data may be cached locally in your browser for performance. This cached data is temporary and can be cleared by clearing your browser data. Legacy offline sessions (v1.0) stored in localStorage are preserved but will be deprecated in future versions.'
            }
          ]
        },
        {
          title: '4. Authentication and Access',
          content: 'The Application uses federated authentication through your organization\'s identity provider:',
          list: [
            'Single Sign-On (SSO) via Microsoft Entra ID or Keycloak',
            'Your password is never stored or processed by this Application',
            'Session tokens are used to maintain your login state',
            'Sessions expire after a period of inactivity for security'
          ]
        },
        {
          title: '5. Who Can Access Your Data',
          subsections: [
            {
              subtitle: 'Role-Based Access',
              content: 'Access to your data is controlled by your organizational role:',
              list: [
                'Employees: Can view and edit their own reviews and self-assessments',
                'Managers: Can view and score their direct reports\' reviews',
                'HR: Can view all reviews within their OpCo, run analytics, and conduct calibration sessions',
                'Administrators: Can manage users, organizational structure, and system configuration'
              ]
            },
            {
              subtitle: 'Data Sharing',
              content: 'Your performance data may be visible to:',
              list: [
                'Your direct manager (for scoring and feedback)',
                'HR personnel (for oversight and calibration)',
                'System administrators (for technical support)',
                'Participants in calibration sessions (HR and leadership)'
              ]
            }
          ]
        },
        {
          title: '6. Voice Input (Speech-to-Text)',
          content: 'If you use the voice input feature, your speech is processed as follows:',
          list: [
            'Browser-based Whisper: Audio is processed locally in your browser using AI models. No audio data is sent to external servers.',
            'Server-based Whisper: Audio is sent to a Whisper server hosted within your organization\'s infrastructure for transcription.',
            'The transcribed text is then stored as part of your review data.'
          ]
        },
        {
          title: '7. Analytics',
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
          title: '8. Data Retention',
          content: 'Your data is retained according to your organization\'s policies:',
          list: [
            'Active review cycles: Retained until completion and archival',
            'Completed reviews: Retained for historical analysis and compliance (typically 7 years)',
            'Audit logs: Retained according to your organization\'s compliance requirements',
            'Account data: Retained while you are an active employee',
            'Legacy localStorage sessions: Automatically expire after 14 days of inactivity'
          ]
        },
        {
          title: '9. Data Export and Portability',
          content: 'You can export your performance review data:',
          list: [
            'Download individual reviews as DOCX reports',
            'HR users can export analytics data to Excel',
            'Historical performance data can be viewed in the History dashboard',
            'Contact your HR department for bulk data export requests'
          ]
        },
        {
          title: '10. Your Rights',
          content: 'Depending on your jurisdiction, you may have the following rights regarding your data:',
          list: [
            'Right to access: View all data we hold about you',
            'Right to rectification: Request corrections to inaccurate data',
            'Right to erasure: Request deletion of your data (subject to legal retention requirements)',
            'Right to portability: Receive your data in a portable format',
            'Right to object: Object to certain processing of your data'
          ],
          footer: 'To exercise these rights, contact your HR department or system administrator.'
        },
        {
          title: '11. Security Measures',
          content: 'We implement the following security measures to protect your data:',
          list: [
            'Encryption in transit (HTTPS/TLS) and at rest',
            'Role-based access control (RBAC)',
            'Audit logging of all data access and modifications',
            'Regular security assessments',
            'Automatic session timeout',
            'Multi-tenant data isolation'
          ]
        },
        {
          title: '12. Disclaimer and Limitation of Liability',
          content: 'This Application is provided as a tool to assist with performance review documentation. It is intended to make the review process easier and more efficient. However:',
          list: [
            'The Application is provided "as is" without warranties of any kind, express or implied',
            'The output generated by this Application is for assistance purposes only and should be reviewed before use',
            'Users are responsible for verifying the accuracy and appropriateness of all generated content',
            'The developers and maintainers shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this Application',
            'The Application does not constitute legal, HR, or professional advice',
            'Final performance review decisions remain the responsibility of the user and their organization'
          ]
        },
        {
          title: '13. Changes to This Policy',
          content: 'We may update this Privacy Policy from time to time. Any changes will be reflected in the "Last updated" date at the top of this page. Significant changes will be communicated through the Application or via your organization.'
        },
        {
          title: '14. Reporting Issues',
          content: 'If you encounter bugs, have feature requests, or want to report security vulnerabilities, please submit an issue through our GitHub repository:',
          list: [
            'Visit: github.com/SimonvanAs/tss_ppm/issues',
            'Click "New Issue" to create a report',
            'Provide as much detail as possible about the issue',
            'For security vulnerabilities, please use responsible disclosure practices'
          ]
        },
        {
          title: '15. Contact',
          content: 'If you have questions about this Privacy Policy or the Application\'s data practices, please contact your HR department, system administrator, or visit our GitHub repository.'
        }
      ]
    },
    nl: {
      title: 'Privacybeleid',
      lastUpdated: 'Laatst bijgewerkt: december 2025 (v2.0)',
      backButton: '← Terug naar applicatie',
      sections: [
        {
          title: '1. Inleiding',
          content: 'Dit Privacybeleid legt uit hoe het TSS Performance Management Systeem ("de Applicatie") met uw gegevens omgaat. Wij zijn toegewijd aan het beschermen van uw privacy en transparant zijn over onze gegevenspraktijken. Dit beleid is van toepassing op versie 2.0, die server-side gegevensopslag en authenticatie bevat.'
        },
        {
          title: '2. Gegevens die we verzamelen',
          subsections: [
            {
              subtitle: 'Accountinformatie',
              content: 'Wanneer u de Applicatie opent, wordt de volgende accountinformatie verzameld via de identiteitsprovider van uw organisatie (Microsoft Entra ID / Keycloak):',
              list: [
                'E-mailadres',
                'Weergavenaam',
                'Medewerker-ID (indien verstrekt door uw organisatie)',
                'Organisatorische rol en afdeling',
                'Manager-toewijzing'
              ]
            },
            {
              subtitle: 'Beoordelingsgegevens',
              content: 'De Applicatie slaat beoordelingsinformatie op, waaronder:',
              list: [
                'Doelen, doelstellingen en hun scores',
                'Competentiebeoordelingen en scores',
                'Zelfevaluaties en manageropmerkingen',
                'Beoordelingscyclus status en workflow-geschiedenis',
                'Handtekeningen en erkenningen',
                'Kalibratie-sessie aanpassingen (voor HR-gebruikers)'
              ]
            },
            {
              subtitle: 'Gebruik en auditgegevens',
              content: 'Om veiligheid en compliance te waarborgen, loggen wij:',
              list: [
                'Inlogtijdstempels en sessie-activiteit',
                'Wijzigingen aan beoordelingen (audit trail)',
                'Kalibratie-aanpassingen met rechtvaardigingen',
                'Administratieve acties'
              ]
            }
          ]
        },
        {
          title: '3. Hoe we uw gegevens opslaan',
          subsections: [
            {
              subtitle: 'Server-side opslag',
              content: 'Uw beoordelingsgegevens worden veilig opgeslagen op servers beheerd door uw organisatie of Total Specific Solutions. Dit omvat:',
              list: [
                'PostgreSQL database met versleuteling in rust',
                'Gegevens worden verzonden via HTTPS (TLS 1.2+)',
                'Regelmatige geautomatiseerde back-ups',
                'Toegangscontroles gebaseerd op uw organisatorische rol'
              ]
            },
            {
              subtitle: 'Multi-tenant architectuur',
              content: 'De Applicatie gebruikt een multi-tenant architectuur waarbij elke Operating Company (OpCo) geïsoleerde gegevens heeft. Uw gegevens zijn alleen toegankelijk voor geautoriseerde gebruikers binnen uw organisatie op basis van hun rol (Medewerker, Manager, HR, Admin).'
            },
            {
              subtitle: 'Lokale browseropslag',
              content: 'Sommige gegevens kunnen lokaal in uw browser worden gecached voor prestaties. Deze gecachte gegevens zijn tijdelijk en kunnen worden gewist door uw browsergegevens te wissen. Legacy offline sessies (v1.0) opgeslagen in localStorage worden bewaard maar zullen in toekomstige versies worden uitgefaseerd.'
            }
          ]
        },
        {
          title: '4. Authenticatie en toegang',
          content: 'De Applicatie gebruikt gefedereerde authenticatie via de identiteitsprovider van uw organisatie:',
          list: [
            'Single Sign-On (SSO) via Microsoft Entra ID of Keycloak',
            'Uw wachtwoord wordt nooit opgeslagen of verwerkt door deze Applicatie',
            'Sessietokens worden gebruikt om uw inlogstatus te behouden',
            'Sessies verlopen na een periode van inactiviteit voor beveiliging'
          ]
        },
        {
          title: '5. Wie toegang heeft tot uw gegevens',
          subsections: [
            {
              subtitle: 'Rolgebaseerde toegang',
              content: 'Toegang tot uw gegevens wordt gecontroleerd door uw organisatorische rol:',
              list: [
                'Medewerkers: Kunnen hun eigen beoordelingen en zelfevaluaties bekijken en bewerken',
                'Managers: Kunnen de beoordelingen van hun directe medewerkers bekijken en scoren',
                'HR: Kan alle beoordelingen binnen hun OpCo bekijken, analyses uitvoeren en kalibratiesessies houden',
                'Beheerders: Kunnen gebruikers, organisatiestructuur en systeemconfiguratie beheren'
              ]
            },
            {
              subtitle: 'Gegevensdeling',
              content: 'Uw prestatiegegevens kunnen zichtbaar zijn voor:',
              list: [
                'Uw directe manager (voor scoring en feedback)',
                'HR-medewerkers (voor toezicht en kalibratie)',
                'Systeembeheerders (voor technische ondersteuning)',
                'Deelnemers aan kalibratiesessies (HR en leiderschap)'
              ]
            }
          ]
        },
        {
          title: '6. Spraakinvoer (Spraak-naar-tekst)',
          content: 'Als u de spraakinvoerfunctie gebruikt, wordt uw spraak als volgt verwerkt:',
          list: [
            'Browser-gebaseerde Whisper: Audio wordt lokaal in uw browser verwerkt met AI-modellen. Er worden geen audiogegevens naar externe servers gestuurd.',
            'Server-gebaseerde Whisper: Audio wordt gestuurd naar een Whisper-server gehost binnen de infrastructuur van uw organisatie voor transcriptie.',
            'De getranscribeerde tekst wordt vervolgens opgeslagen als onderdeel van uw beoordelingsgegevens.'
          ]
        },
        {
          title: '7. Analytics',
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
          title: '8. Gegevensretentie',
          content: 'Uw gegevens worden bewaard volgens het beleid van uw organisatie:',
          list: [
            'Actieve beoordelingscycli: Bewaard tot voltooiing en archivering',
            'Voltooide beoordelingen: Bewaard voor historische analyse en compliance (meestal 7 jaar)',
            'Auditlogs: Bewaard volgens de compliance-eisen van uw organisatie',
            'Accountgegevens: Bewaard zolang u een actieve medewerker bent',
            'Legacy localStorage-sessies: Verlopen automatisch na 14 dagen inactiviteit'
          ]
        },
        {
          title: '9. Gegevensexport en overdraagbaarheid',
          content: 'U kunt uw beoordelingsgegevens exporteren:',
          list: [
            'Download individuele beoordelingen als DOCX-rapporten',
            'HR-gebruikers kunnen analysegegevens exporteren naar Excel',
            'Historische prestatiegegevens kunnen worden bekeken in het Geschiedenis-dashboard',
            'Neem contact op met uw HR-afdeling voor bulk gegevensexport-verzoeken'
          ]
        },
        {
          title: '10. Uw rechten',
          content: 'Afhankelijk van uw jurisdictie kunt u de volgende rechten hebben met betrekking tot uw gegevens:',
          list: [
            'Recht op toegang: Bekijk alle gegevens die we over u bewaren',
            'Recht op rectificatie: Verzoek om correcties van onjuiste gegevens',
            'Recht op verwijdering: Verzoek om verwijdering van uw gegevens (onder voorbehoud van wettelijke bewaarvereisten)',
            'Recht op overdraagbaarheid: Ontvang uw gegevens in een overdraagbaar formaat',
            'Recht op bezwaar: Maak bezwaar tegen bepaalde verwerking van uw gegevens'
          ],
          footer: 'Om deze rechten uit te oefenen, neem contact op met uw HR-afdeling of systeembeheerder.'
        },
        {
          title: '11. Beveiligingsmaatregelen',
          content: 'We implementeren de volgende beveiligingsmaatregelen om uw gegevens te beschermen:',
          list: [
            'Versleuteling tijdens transport (HTTPS/TLS) en in rust',
            'Rolgebaseerde toegangscontrole (RBAC)',
            'Auditlogging van alle gegevenstoegang en wijzigingen',
            'Regelmatige beveiligingsbeoordelingen',
            'Automatische sessie-timeout',
            'Multi-tenant gegevensisolatie'
          ]
        },
        {
          title: '12. Disclaimer en beperking van aansprakelijkheid',
          content: 'Deze Applicatie wordt aangeboden als hulpmiddel bij de documentatie van beoordelingsgesprekken. Het is bedoeld om het beoordelingsproces gemakkelijker en efficiënter te maken. Echter:',
          list: [
            'De Applicatie wordt geleverd "zoals deze is" zonder enige garantie, expliciet of impliciet',
            'De output gegenereerd door deze Applicatie is alleen ter ondersteuning en dient voor gebruik te worden gecontroleerd',
            'Gebruikers zijn verantwoordelijk voor het verifiëren van de juistheid en geschiktheid van alle gegenereerde inhoud',
            'De ontwikkelaars en beheerders zijn niet aansprakelijk voor directe, indirecte, incidentele of gevolgschade voortvloeiend uit het gebruik van deze Applicatie',
            'De Applicatie vormt geen juridisch, HR- of professioneel advies',
            'Definitieve beoordelingsbeslissingen blijven de verantwoordelijkheid van de gebruiker en hun organisatie'
          ]
        },
        {
          title: '13. Wijzigingen in dit beleid',
          content: 'We kunnen dit Privacybeleid van tijd tot tijd bijwerken. Eventuele wijzigingen worden weergegeven in de "Laatst bijgewerkt" datum bovenaan deze pagina. Belangrijke wijzigingen worden gecommuniceerd via de Applicatie of via uw organisatie.'
        },
        {
          title: '14. Problemen melden',
          content: 'Als u bugs tegenkomt, functieverzoeken heeft of beveiligingsproblemen wilt melden, dien dan een issue in via onze GitHub-repository:',
          list: [
            'Bezoek: github.com/SimonvanAs/tss_ppm/issues',
            'Klik op "New Issue" om een melding te maken',
            'Geef zoveel mogelijk details over het probleem',
            'Voor beveiligingsproblemen, gebruik verantwoorde openbaarmakingspraktijken'
          ]
        },
        {
          title: '15. Contact',
          content: 'Als u vragen heeft over dit Privacybeleid of de gegevenspraktijken van de Applicatie, neem dan contact op met uw HR-afdeling, systeembeheerder of bezoek onze GitHub-repository.'
        }
      ]
    },
    es: {
      title: 'Política de Privacidad',
      lastUpdated: 'Última actualización: diciembre 2025 (v2.0)',
      backButton: '← Volver a la aplicación',
      sections: [
        {
          title: '1. Introducción',
          content: 'Esta Política de Privacidad explica cómo el Sistema de Gestión de Desempeño TSS ("la Aplicación") maneja sus datos. Estamos comprometidos a proteger su privacidad y ser transparentes sobre nuestras prácticas de datos. Esta política aplica a la versión 2.0, que incluye almacenamiento de datos del lado del servidor y autenticación.'
        },
        {
          title: '2. Datos que recopilamos',
          subsections: [
            {
              subtitle: 'Información de cuenta',
              content: 'Cuando accede a la Aplicación, se recopila la siguiente información de cuenta a través del proveedor de identidad de su organización (Microsoft Entra ID / Keycloak):',
              list: [
                'Dirección de correo electrónico',
                'Nombre para mostrar',
                'ID de empleado (si lo proporciona su organización)',
                'Rol organizacional y departamento',
                'Asignación de gerente'
              ]
            },
            {
              subtitle: 'Datos de evaluación de desempeño',
              content: 'La Aplicación almacena información de evaluación de desempeño que incluye:',
              list: [
                'Metas, objetivos y sus puntuaciones',
                'Evaluaciones de competencias y puntuaciones',
                'Autoevaluaciones y comentarios del gerente',
                'Estado del ciclo de evaluación e historial de flujo de trabajo',
                'Firmas y reconocimientos',
                'Ajustes de sesiones de calibración (para usuarios de RRHH)'
              ]
            },
            {
              subtitle: 'Datos de uso y auditoría',
              content: 'Para garantizar la seguridad y el cumplimiento, registramos:',
              list: [
                'Marcas de tiempo de inicio de sesión y actividad de sesión',
                'Cambios realizados en las evaluaciones (pista de auditoría)',
                'Ajustes de calibración con justificaciones',
                'Acciones administrativas'
              ]
            }
          ]
        },
        {
          title: '3. Cómo almacenamos sus datos',
          subsections: [
            {
              subtitle: 'Almacenamiento del lado del servidor',
              content: 'Sus datos de evaluación de desempeño se almacenan de forma segura en servidores administrados por su organización o Total Specific Solutions. Esto incluye:',
              list: [
                'Base de datos PostgreSQL con cifrado en reposo',
                'Los datos se transmiten a través de HTTPS (TLS 1.2+)',
                'Copias de seguridad automatizadas regulares',
                'Controles de acceso basados en su rol organizacional'
              ]
            },
            {
              subtitle: 'Arquitectura multi-inquilino',
              content: 'La Aplicación utiliza una arquitectura multi-inquilino donde cada Compañía Operativa (OpCo) tiene datos aislados. Sus datos solo son accesibles para usuarios autorizados dentro de su organización según su rol (Empleado, Gerente, RRHH, Admin).'
            },
            {
              subtitle: 'Almacenamiento local del navegador',
              content: 'Algunos datos pueden almacenarse en caché localmente en su navegador para mejorar el rendimiento. Estos datos en caché son temporales y se pueden eliminar borrando los datos de su navegador. Las sesiones offline heredadas (v1.0) almacenadas en localStorage se conservan pero quedarán obsoletas en versiones futuras.'
            }
          ]
        },
        {
          title: '4. Autenticación y acceso',
          content: 'La Aplicación utiliza autenticación federada a través del proveedor de identidad de su organización:',
          list: [
            'Inicio de sesión único (SSO) a través de Microsoft Entra ID o Keycloak',
            'Su contraseña nunca es almacenada ni procesada por esta Aplicación',
            'Se utilizan tokens de sesión para mantener su estado de inicio de sesión',
            'Las sesiones expiran después de un período de inactividad por seguridad'
          ]
        },
        {
          title: '5. Quién puede acceder a sus datos',
          subsections: [
            {
              subtitle: 'Acceso basado en roles',
              content: 'El acceso a sus datos está controlado por su rol organizacional:',
              list: [
                'Empleados: Pueden ver y editar sus propias evaluaciones y autoevaluaciones',
                'Gerentes: Pueden ver y puntuar las evaluaciones de sus reportes directos',
                'RRHH: Puede ver todas las evaluaciones dentro de su OpCo, ejecutar análisis y realizar sesiones de calibración',
                'Administradores: Pueden gestionar usuarios, estructura organizacional y configuración del sistema'
              ]
            },
            {
              subtitle: 'Compartir datos',
              content: 'Sus datos de desempeño pueden ser visibles para:',
              list: [
                'Su gerente directo (para puntuación y retroalimentación)',
                'Personal de RRHH (para supervisión y calibración)',
                'Administradores del sistema (para soporte técnico)',
                'Participantes en sesiones de calibración (RRHH y liderazgo)'
              ]
            }
          ]
        },
        {
          title: '6. Entrada de voz (Voz a texto)',
          content: 'Si utiliza la función de entrada de voz, su voz se procesa de la siguiente manera:',
          list: [
            'Whisper basado en navegador: El audio se procesa localmente en su navegador utilizando modelos de IA. No se envían datos de audio a servidores externos.',
            'Whisper basado en servidor: El audio se envía a un servidor Whisper alojado dentro de la infraestructura de su organización para transcripción.',
            'El texto transcrito se almacena como parte de sus datos de evaluación.'
          ]
        },
        {
          title: '7. Análisis',
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
          title: '8. Retención de datos',
          content: 'Sus datos se retienen de acuerdo con las políticas de su organización:',
          list: [
            'Ciclos de evaluación activos: Retenidos hasta su finalización y archivo',
            'Evaluaciones completadas: Retenidas para análisis histórico y cumplimiento (típicamente 7 años)',
            'Registros de auditoría: Retenidos según los requisitos de cumplimiento de su organización',
            'Datos de cuenta: Retenidos mientras sea un empleado activo',
            'Sesiones heredadas de localStorage: Expiran automáticamente después de 14 días de inactividad'
          ]
        },
        {
          title: '9. Exportación y portabilidad de datos',
          content: 'Puede exportar sus datos de evaluación de desempeño:',
          list: [
            'Descargar evaluaciones individuales como informes DOCX',
            'Los usuarios de RRHH pueden exportar datos de análisis a Excel',
            'Los datos históricos de desempeño se pueden ver en el panel de Historial',
            'Contacte a su departamento de RRHH para solicitudes de exportación masiva de datos'
          ]
        },
        {
          title: '10. Sus derechos',
          content: 'Dependiendo de su jurisdicción, puede tener los siguientes derechos con respecto a sus datos:',
          list: [
            'Derecho de acceso: Ver todos los datos que tenemos sobre usted',
            'Derecho de rectificación: Solicitar correcciones de datos inexactos',
            'Derecho de supresión: Solicitar la eliminación de sus datos (sujeto a requisitos legales de retención)',
            'Derecho a la portabilidad: Recibir sus datos en un formato portable',
            'Derecho de oposición: Oponerse a cierto procesamiento de sus datos'
          ],
          footer: 'Para ejercer estos derechos, contacte a su departamento de RRHH o administrador del sistema.'
        },
        {
          title: '11. Medidas de seguridad',
          content: 'Implementamos las siguientes medidas de seguridad para proteger sus datos:',
          list: [
            'Cifrado en tránsito (HTTPS/TLS) y en reposo',
            'Control de acceso basado en roles (RBAC)',
            'Registro de auditoría de todos los accesos y modificaciones de datos',
            'Evaluaciones de seguridad regulares',
            'Tiempo de espera automático de sesión',
            'Aislamiento de datos multi-inquilino'
          ]
        },
        {
          title: '12. Descargo de responsabilidad y limitación de responsabilidad',
          content: 'Esta Aplicación se proporciona como una herramienta para asistir con la documentación de evaluaciones de desempeño. Está destinada a hacer el proceso de evaluación más fácil y eficiente. Sin embargo:',
          list: [
            'La Aplicación se proporciona "tal cual" sin garantías de ningún tipo, expresas o implícitas',
            'El resultado generado por esta Aplicación es solo para fines de asistencia y debe ser revisado antes de su uso',
            'Los usuarios son responsables de verificar la exactitud y la idoneidad de todo el contenido generado',
            'Los desarrolladores y mantenedores no serán responsables de ningún daño directo, indirecto, incidental o consecuente derivado del uso de esta Aplicación',
            'La Aplicación no constituye asesoramiento legal, de recursos humanos o profesional',
            'Las decisiones finales de evaluación de desempeño siguen siendo responsabilidad del usuario y su organización'
          ]
        },
        {
          title: '13. Cambios en esta política',
          content: 'Podemos actualizar esta Política de Privacidad de vez en cuando. Cualquier cambio se reflejará en la fecha "Última actualización" en la parte superior de esta página. Los cambios significativos se comunicarán a través de la Aplicación o a través de su organización.'
        },
        {
          title: '14. Reportar problemas',
          content: 'Si encuentra errores, tiene solicitudes de funciones o desea reportar vulnerabilidades de seguridad, envíe un issue a través de nuestro repositorio de GitHub:',
          list: [
            'Visite: github.com/SimonvanAs/tss_ppm/issues',
            'Haga clic en "New Issue" para crear un reporte',
            'Proporcione tantos detalles como sea posible sobre el problema',
            'Para vulnerabilidades de seguridad, utilice prácticas de divulgación responsable'
          ]
        },
        {
          title: '15. Contacto',
          content: 'Si tiene preguntas sobre esta Política de Privacidad o las prácticas de datos de la Aplicación, contacte a su departamento de RRHH, administrador del sistema o visite nuestro repositorio de GitHub.'
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
        <span className="app-footer-ai">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
          </svg>
          <span>Made with AI assistance</span>
        </span>
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
