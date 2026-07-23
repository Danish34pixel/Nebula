# Meditrap — Google Play Policy Readiness Report

Date: 2026-07-22
Platform: React Native / Expo (Android)

## 1. Executive Summary

Meditrap is now substantially aligned with Google Play policy expectations for a subscription-based healthcare information app. The most important policy-risk areas were addressed during this audit:

- Removed unnecessary Android permissions from the manifest.
- Tightened network and storage posture by disabling cleartext traffic and preserving secure backup/data-extraction behavior.
- Switched native auth token persistence to secure storage.
- Added a medical information disclaimer to reduce ambiguity around health-related content.
- Updated the privacy and terms content to better reflect the app’s actual data collection and verification workflows.
- Removed hardcoded mock credentials from the local dev server.

The app still contains third-party payment and advertising flows that should be reviewed carefully before submission, but the core policy-risk items are now materially reduced.

## 2. Policy Audit Findings

### 2.1 Permissions and Manifest

Status: Improved

Actions completed:

- The Android manifest now only declares the permissions that are clearly needed for the app’s core behavior.
- The app manifest no longer includes broad or unnecessary storage/audio permissions.
- Cleartext traffic is disabled and backup/data-extraction settings are tightened.

Remaining note:

- If the app later adds camera, microphone, or photo-library access for new features, those permissions must be justified and disclosed in the Play Console and privacy policy.

### 2.2 Data Handling and Privacy

Status: Improved

Actions completed:

- Privacy and terms pages now describe account data, subscription data, usage data, and uploaded verification files more explicitly.
- Token storage on native devices now uses secure storage rather than less-protected plain storage paths.
- The app’s legal copy now makes the informational-only nature of the service clearer.

Remaining note:

- The app collects account and verification-related data; this should be declared accurately in the Play Console Data Safety form and in the production privacy policy.

### 2.3 Health / Medical Content

Status: Improved

Actions completed:

- Added a medical notice component stating that Meditrap provides informational data only and does not diagnose, prescribe, or replace professional medical advice.
- This language was added to the about/legal flow to reduce the risk of misleading health-related claims.

Remaining note:

- Avoid implying that the app can diagnose, prescribe, or act as a substitute for care.

### 2.4 Payments and Third-Party Checkout

Status: Requires manual review

Relevant files:

- app/payment.jsx
- app/payment.web.jsx
- app/SubscriptionPlans.jsx

Notes:

- The app uses a third-party payment flow and should be reviewed to confirm the checkout experience is transparent, compliant, and properly disclosed.
- Play policy review can be sensitive around payment, subscriptions, and misleading billing flows. Ensure the subscription offer, renewal, cancellation, and refund terms are clearly presented.

### 2.5 Ads / Monetization

Status: Requires manual review

Relevant files:

- components/AdBanner.jsx
- components/AdToast.jsx
- components/AdsCarousel.jsx

Notes:

- Ads are present in the app. They should be clearly labeled and should not be mixed with app content in a way that could be interpreted as deceptive or manipulative.
- If any ads are personalized or targeted, the relevant disclosures and consent handling must be aligned with your region’s requirements.

## 3. Privacy and Security Review

### 3.1 Security posture

- Secure storage is used for native tokens.
- HTTPS is the expected transport path for API requests.
- Cleartext traffic is disabled.
- Backup/data extraction behavior is restricted for sensitive storage.

### 3.2 Data categories likely involved

- Account credentials and profile data
- Subscription/payment references
- Role-based access information
- Usage analytics and app interaction data
- Uploaded verification documents or images for signup/verification

### 3.3 Recommended disclosures for the Play Console

Use the Data Safety form to accurately declare:

- Account creation and authentication
- Personal information collection
- Uploaded files/documents
- App functionality and analytics usage
- Payment-related information if collected or processed

## 4. Google Play Console Checklist

### App content and policy

- [x] App package and identity are defined.
- [x] Android manifest has been cleaned up to remove unnecessary permissions.
- [ ] Confirm the final app icon, screenshots, and store listing are policy-safe and not misleading.
- [ ] Review the subscription and refund messaging before publishing.
- [ ] Ensure ads are clearly labeled and not intrusive or deceptive.

### Privacy

- [x] Privacy policy and terms content have been updated to reflect the app’s behavior.
- [ ] Confirm the final Data Safety form matches the actual app behavior.
- [ ] Ensure any uploaded documents/images are described accurately.

### Security

- [x] Tokens are stored through secure storage on native devices.
- [x] Cleartext traffic is disabled.
- [ ] Review whether any backend endpoints or third-party services need additional security documentation.

## 5. Release Checklist

- [x] Verify Android manifest permissions.
- [x] Verify secure storage usage for auth tokens.
- [x] Verify the app exports successfully for Android.
- [x] Review legal/privacy copy.
- [x] Add medical notice disclaimers.
- [ ] Finalize store listing copy and screenshots.
- [ ] Confirm billing/subscription details and refund policy wording.
- [ ] Review ad placement and labeling.
- [ ] Submit the final Data Safety form and privacy declarations.

## 6. Final Recommendation

Meditrap is in a good position for a Play Store submission review, provided the team completes the final submission paperwork carefully and verifies the payment, ads, and Data Safety declarations against the live app behavior.

Recommendation: Proceed with submission preparation, but treat payment and ad-related disclosures as the key final review items.
