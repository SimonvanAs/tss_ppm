# TSS PPM Keycloak Theme

This directory contains a custom Keycloak theme that matches the TSS PPM application styling.

## Theme Structure

```
themes/
└── tss-ppm/
    └── login/
        ├── theme.properties
        ├── template.ftl
        ├── login.ftl
        └── resources/
            ├── css/
            │   └── login.css
            └── img/
                └── logo.png
```

## Features

- **Brand Colors**: Uses TSS PPM brand colors (Magenta #CC0E70, Navy Blue #004A91)
- **Typography**: Tahoma font family matching the application
- **Styling**: Gradient backgrounds, rounded corners, and shadows matching the app design
- **Responsive**: Mobile-friendly design
- **Logo**: TSS logo displayed on login page

## Installation

The theme is automatically mounted in Docker Compose. To apply it:

1. **Via Realm Import**: The realm JSON (`tss-ppm-realm.json`) is configured with `"loginTheme": "tss-ppm"`

2. **Manual Configuration** (if needed):
   - Access Keycloak Admin Console
   - Navigate to: Realm Settings → Themes
   - Set "Login theme" to "tss-ppm"
   - Click "Save"

## Customization

To modify the theme:

1. Edit CSS in `tss-ppm/login/resources/css/login.css`
2. Edit templates in `tss-ppm/login/*.ftl`
3. Replace logo in `tss-ppm/login/resources/img/logo.png`
4. Restart Keycloak container to apply changes

## Color Reference

- Primary Magenta: `#CC0E70`
- Primary Navy: `#004A91`
- Text Dark: `#333333`
- Text Light: `#666666`
- Border: `#ddd`
- Error: `#DC3545`
- Success: `#28A745`
