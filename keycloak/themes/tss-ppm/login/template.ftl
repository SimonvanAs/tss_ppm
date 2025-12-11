<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false; section>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}"<#if realm.internationalizationEnabled> lang="${locale.currentLanguageTag}"</#if>>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico">
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet"/>
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
</head>
<body class="${bodyClass}">
<div class="login-container">
    <div class="login-card">
        <#if section = "header">
            <#nested>
        </#if>
        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="alert alert-${message.type}">
                <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>
        <#if section = "form">
            <#nested>
        </#if>
        <#if displayRequiredFields>
            <div class="kc-required-fields">${msg("requiredFields")}</div>
        </#if>
        <#if section = "info" && displayInfo>
            <#nested>
        </#if>
    </div>
</div>
</body>
</html>
</#macro>
