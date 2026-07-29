## [1.8.3](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.8.2...v1.8.3) (2026-07-29)


### Bug Fixes

* **settings:** persist system settings in Postgres so deploys stop resetting them ([8d22e62](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8d22e6248845696a81ec6ac12c0a3510f7fa4962))

## [1.8.2](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.8.1...v1.8.2) (2026-07-29)


### Bug Fixes

* **applications:** label unassigned applicants as applied and offer Longlist action ([8c1a63d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8c1a63de7857bb5cd31acd4ee513463846075f00))

## [1.8.1](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.8.0...v1.8.1) (2026-07-29)


### Bug Fixes

* **applications:** show real status for applicants not yet assigned a stage ([97d9290](https://github.com/kondjaboytjie/HumanResourceSystem/commit/97d9290fd50975c44c515793845eedb2424d569f))


### Reverts

* restore codebase to pre-Selma-merge state (b89ab0b) ([b17566e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b17566e6b1f07098fbe6f00c866d3bb7a0e9edfb))

## [1.7.1](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.7.0...v1.7.1) (2026-07-02)


### Bug Fixes

* **profile:** stop My Profile resetting during silent session refresh ([23e82e5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/23e82e50d974ec39a10e02d42723a7fe7f48fcad))

# [1.7.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.6.0...v1.7.0) (2026-06-25)


### Features

* **applications:** add My Applications page for job seekers ([8eb4d2a](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8eb4d2ab439cbdcfef22bfd352556c6bfcaf4bd1))

# [1.6.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.5.0...v1.6.0) (2026-06-25)


### Features

* **settings:** audit system settings changes, show app version, ignore runtime settings file ([b5d8110](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b5d81102c5d6b75f37d7fdc4158a16d20abaf20b))

# [1.5.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.4.0...v1.5.0) (2026-06-25)


### Features

* **applications:** capture and report applicant expected salary ([d23c927](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d23c927ae71d3455dd0f8a173f3a8762591db8c6))

# [1.4.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.3.1...v1.4.0) (2026-06-25)


### Features

* **jobs:** make salary min/max optional on create and update ([6567b99](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6567b99148dc948505f782bb20ccdd3fd7fb565a))

## [1.3.1](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.3.0...v1.3.1) (2026-06-02)


### Performance Improvements

* **server:** stop loading file_data in document/resume metadata reads ([d19292b](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d19292b50b4b44efa3195c2dfa60c24350374bf6))

# [1.3.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.2.2...v1.3.0) (2026-05-29)


### Features

* **permissions:** remove EDIT_JOBSEEKER_PROFILE, keep EDIT_USER ([d095ee4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d095ee4fd3eda33be1102a3bec0e8d10657cf56a))

## [1.2.2](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.2.1...v1.2.2) (2026-05-26)


### Bug Fixes

* **server:** include all build-time deps in dependencies for Nixpacks ([5400767](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5400767c97f84996b8f8be8cd44f006d8f670ad7))

## [1.2.1](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.2.0...v1.2.1) (2026-05-26)


### Bug Fixes

* **server:** make tsc available during Nixpacks build ([26cdad1](https://github.com/kondjaboytjie/HumanResourceSystem/commit/26cdad191c18fcd7cfe5c7aa4537c5262edb0446))

# [1.2.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.1.0...v1.2.0) (2026-05-26)


### Features

* **ui:** wire EDIT_JOBSEEKER_PROFILE and EDIT_USER edit flows ([b2e56b5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b2e56b5fceb2c8f4a3eac01e1ed8c5ee98ced283))

# [1.1.0](https://github.com/kondjaboytjie/HumanResourceSystem/compare/v1.0.0...v1.1.0) (2026-05-26)


### Features

* **permissions:** add EDIT_JOBSEEKER_PROFILE and EDIT_USER ([335e5fa](https://github.com/kondjaboytjie/HumanResourceSystem/commit/335e5fa0594a69a2bdb902e88a8e0384f5b38568))

# 1.0.0 (2026-04-23)


### Bug Fixes

* add explicit Caddyfile with correct PORT and dist path ([881e029](https://github.com/kondjaboytjie/HumanResourceSystem/commit/881e0293fdc184f66175ec956ee2f743bf773209))
* add Node 22 version for server, regenerate package-lock.json ([6b40eb2](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6b40eb26cdd29b41c8502ba3d79653584c007e52))
* add railway.toml configs to override Railpack auto-detection ([6a53a56](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6a53a567abe7838458b912dc337a24e5f693de26))
* add serve as production dependency to avoid npx download delay ([8d688c9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8d688c95231507760a94648719e9f7de32c9a623))
* bind web serve to 0.0.0.0 so Railway proxy can reach it ([d0dd6ce](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d0dd6ce8ac44d40e96c102eaeab1fe2a53fa526b))
* **ci:** disable body/footer line-length limits to unblock semantic-release commits ([32c9eee](https://github.com/kondjaboytjie/HumanResourceSystem/commit/32c9eee00d1ad5f14a58771a1af165530b6ff769))
* correct spelling of "Developbed" to "Developed" in footer text ([141bce7](https://github.com/kondjaboytjie/HumanResourceSystem/commit/141bce74b1b68cf22e423ded80dde0c2a19a0b15))
* downgrade uuid to v9 for CommonJS compatibility ([b54e7f1](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b54e7f16b1411cb5fa2117ef1daf0181eeedcd2b))
* ensure type consistency for permissions check in user profile access ([0d0a768](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0d0a7682e02946d4f867aafc57be548e9aa26dee))
* let Nixpacks use Caddy to serve web (remove serve override) ([c9f0305](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c9f0305175aa6f2ad89f089078a2947b62288fdb))
* only load .env in development in app.ts (same as index.ts) ([a4efa80](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a4efa80e4d873196d283575140020c6e3ccc2186))
* only load .env in development, use platform env vars in production ([d99e920](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d99e9205d7b7721d3264ebe4872e638476900066))
* use Caddy (Nixpacks-configured) to serve web frontend ([3ff49f5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3ff49f504e9d4cd860d66092fff6b9f0b206ba30))
* use Node 22, remove duplicate npm ci in build command ([7dff114](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7dff1142fbc5a0ccda824f0d0efdd68067cdf943))


### Features

* add account activation check on login and 2FA challenge routes ([6faa435](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6faa43590503563c1d3f1bce8a918eae7752257a))
* add autocomplete styles for suggestion dropdowns ([c0a4c63](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c0a4c634193c0f6db08d3a83d2d56cf36e91640f))
* add cache control headers to system settings response for improved client-side caching ([4ebf540](https://github.com/kondjaboytjie/HumanResourceSystem/commit/4ebf54005eede50fe3a50a695a0b8049467b2b82))
* add compact display URL function for improved document link presentation ([252febb](https://github.com/kondjaboytjie/HumanResourceSystem/commit/252febb75109e1f129be33d8821631c9ff1a64a7))
* add company and job application statistics cards with responsive layout ([4758e31](https://github.com/kondjaboytjie/HumanResourceSystem/commit/4758e31336e8145c545b79aec624c33ee6beefa7))
* add consolidated permissions upsert script with comprehensive action types for applications and user management ([03c3108](https://github.com/kondjaboytjie/HumanResourceSystem/commit/03c31083a2282e1f6d3fab05dbcfed810a8cc01e))
* add country name resolution from geo value and conditionally hide footer in App component ([1566b0e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/1566b0e12f08f74fd81a3b8337b32befd4f63eb0))
* add dismissible notifications with close button functionality ([dbfb176](https://github.com/kondjaboytjie/HumanResourceSystem/commit/dbfb1760d1d44a8a9e8c8f11c6d46cec4b1470b1))
* add endpoint to retrieve company details by ID and update system name logic in login and public job pages ([0d90399](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0d9039988374fe293e99fc3da1f745d87cbb4580))
* add fallback handling for authenticated file fetch in UploadedDocumentCard ([37eb1a9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/37eb1a924d243513e41499edc112e9ef792fe55f))
* add file name extraction and enhance document display in job applications ([bb4d6ef](https://github.com/kondjaboytjie/HumanResourceSystem/commit/bb4d6effcbf94701974cab54e91823286cb6245e))
* add file_data column to documents table and update document handling to persist file data ([bf554f4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/bf554f4b61eb91fa9d66e954afb7343b5fdc48d0))
* add functionality to create and manage job subcategories with modal interface ([55f72f4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/55f72f42c935ba7a20e89ebd8b9c0423f1834c96))
* add functionality to create non-job-seeker users and update permissions ([877b61d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/877b61d90da790fee25d8c5408e94fb7bbffa958))
* add industries seed data and enhance permissions for reports and companies management ([cc80425](https://github.com/kondjaboytjie/HumanResourceSystem/commit/cc8042590a2ce5e814334b33413c9e92c957e5d9))
* add job categories and subcategories seed data for Namibia ([0578fed](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0578fedefb43d146cfdff8463d80711d08d9b367))
* add job seeker alert preferences and notification handling for application updates ([34522f8](https://github.com/kondjaboytjie/HumanResourceSystem/commit/34522f8ac6630f3df9cd99e38f75157c4adf3520))
* add job statistics cards to Applications and Jobs pages for enhanced data visibility ([52e629d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/52e629d3fb277f3e04562c6ee081da84f271fb0f))
* add layout and styling for job seeker filters and results section ([33670df](https://github.com/kondjaboytjie/HumanResourceSystem/commit/33670df45e8d359ac45c099bc5e022f73cebe2c2))
* add legacy application document handling to prompt re-upload for job applications ([83db813](https://github.com/kondjaboytjie/HumanResourceSystem/commit/83db813ddbe3a2b4901b81be7d245540bf581471))
* add legacy document check for application submissions to enforce re-upload requirements ([c6dc931](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c6dc9316261231aeae3df86dfb3468fb264c7afa))
* add logic to filter out generated profile export documents from profile collections ([762bfde](https://github.com/kondjaboytjie/HumanResourceSystem/commit/762bfdeb4e0b79fdee4955156a5568b9d3e450cd))
* add login details parsing and display in inbox page notifications ([d76b07d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d76b07df6b13dceadc1b536afd38980e47328738))
* add LogoutIcon component and update button styles for consistency ([01123bd](https://github.com/kondjaboytjie/HumanResourceSystem/commit/01123bd25fcf95ee7feebf35825cd7e8fe16215a))
* add monthly visits statistic to admin dashboard and update statistics API response ([7c78562](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7c78562ce71efaaae0eb593418a99c4d09491d0f))
* add new application status permissions and update authorization logic ([be7fd29](https://github.com/kondjaboytjie/HumanResourceSystem/commit/be7fd29c1ec92aa21cbc6a484575d5eb2b2f9241))
* add new dashboard permissions and update related documentation ([74e432f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/74e432f7437b05811a35701886bcd436c652f2da))
* add notice state to login page for improved user feedback on actions ([297af3f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/297af3fa7a50e5c7f4713b50b5979a0dcea9b17b))
* add overall statistics for job seekers directory including total, active, blocked, and inactive counts ([1407bb6](https://github.com/kondjaboytjie/HumanResourceSystem/commit/1407bb6ff9e7ece4219448ff72ef228980074499))
* add pagination bar component and improve table styling for better usability ([22d07b8](https://github.com/kondjaboytjie/HumanResourceSystem/commit/22d07b8761d7c3eafbd92414d71a0294da553017))
* add pagination components to Reports, Roles, and Users pages ([cf78359](https://github.com/kondjaboytjie/HumanResourceSystem/commit/cf783597aa383fd95b4dd9c04e4f0373e60d3dee))
* add pagination controls to InboxPage for improved message navigation ([b71c749](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b71c749cec0b5481d4ef74a108c6e1fe22853363))
* add pagination for seeker applications and enhance layout for job listings ([d87153c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d87153ce76b7a90ab5a36b78555b2f5d68a4c8ec))
* add pdf-lib for PDF handling and implement PDF attachment merging in profile report ([c20f788](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c20f7881df3e80423972f49e3bb30e58907ba611))
* add pending job application card and enhance report card styles for improved UI ([3cc2a8f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3cc2a8fe008632c3146c2f717b37299a4243a656))
* add permission and functionality to move applicants back to All Applicants ([3e02a81](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3e02a81ae359bd99e4f965891f59bd91984731ef))
* add phone number to user profile and enhance document handling in profile page ([62be836](https://github.com/kondjaboytjie/HumanResourceSystem/commit/62be836dad25a597339446eef128a177c6a9b351))
* add phone number validation to registration and profile update, enhance loading indicators across pages ([61e6919](https://github.com/kondjaboytjie/HumanResourceSystem/commit/61e69198b7814c18ec292c630aef8174853bc7ed))
* add profile picture retrieval functionality and update UI to display user profile pictures ([376d8e4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/376d8e4d83e3af7b3ec6a7b8f95da1cf321fbcaa))
* add PublicJobsPage component for job listings and applications ([0c4dd97](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0c4dd97d4c03606f592272b624b1b0330b7369e5))
* add rich text editor and viewer components; integrate DOMPurify for HTML sanitization ([42c090c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/42c090cf4746a1b6571e2704fc76ea4863d6fcdf))
* add rules for commit header length enforcement ([cdcb1d0](https://github.com/kondjaboytjie/HumanResourceSystem/commit/cdcb1d0f2f1691aa8ae0fe905065eb8dea418efa))
* add search functionality to job listings; enhance RichTextEditor with heading formatting options; improve styling for rich text headings ([11a0908](https://github.com/kondjaboytjie/HumanResourceSystem/commit/11a0908506ef47aabf7927c6495822a9097425c4))
* add semantic release setup with commitlint and husky for version management ([86fa378](https://github.com/kondjaboytjie/HumanResourceSystem/commit/86fa378e0931b7c502d9c7679fe5b14b40aa41bf))
* add setup guard and success message to MainCompanySetupPage ([f8c162c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f8c162cbafbfc525ea358f09b0404ebccb3c9e26))
* add SQL script to store uploads in DB for users, documents, and resumes ([a8d8081](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a8d80819aaeed9d311266453af3469051276506b))
* add status management for industries with activation and deactivation endpoints ([073021b](https://github.com/kondjaboytjie/HumanResourceSystem/commit/073021b60fef8049076a90cf751f2002e60b855c))
* add total job seekers statistic to dashboard and update dependencies ([c10406f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c10406f7d48373eb387b3ebc23c548cc14006518))
* add user display name retrieval from session, enhancing user experience in layout ([751ea07](https://github.com/kondjaboytjie/HumanResourceSystem/commit/751ea079f0e7a2906f1eebee210fb50f65945d47))
* add user growth analytics endpoint and integrate into dashboard ([3da4a47](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3da4a47b085ec5a2356d759539722d98c6c72e34))
* add user resume listing functionality and enhance profile page document handling ([594f59f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/594f59fd8ddc89babc1c44d0db9bed2506b8e5b5))
* add visit trend months selection and enhance trend line visualization on dashboard ([9f3fcd3](https://github.com/kondjaboytjie/HumanResourceSystem/commit/9f3fcd311844202afc9ef39f42e208b6b9eab375))
* add work mode options to job postings and enhance pagination in Roles page ([a68a976](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a68a97630f88258393aba9eeb00cf956ba45c965))
* **auth:** add login notification email functionality ([e444eab](https://github.com/kondjaboytjie/HumanResourceSystem/commit/e444eabc6b8b4bb9c1a659f2b0d4ae61e4e7c031))
* **auth:** implement token fingerprinting for enhanced session management ([bc7a9a5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/bc7a9a5f35f7c8a21f57315cb43f72cf3bfa3963))
* **auth:** implement user session persistence for login and token refresh ([67f20c1](https://github.com/kondjaboytjie/HumanResourceSystem/commit/67f20c177918413a93572e30c7030ee18d21f7b5))
* block applying when documents use legacy uploads links ([7c96962](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7c969620d363f6c6201d76c209f192b2dc823d80))
* calculate total monthly visits and update dashboard with TrendLinePanel ([417a377](https://github.com/kondjaboytjie/HumanResourceSystem/commit/417a37702a8c27693c20732310abe121953d06b8))
* **CompaniesPage:** add logo display functionality in company view and edit panels ([30a7b39](https://github.com/kondjaboytjie/HumanResourceSystem/commit/30a7b39b73523d75f0b949ea27fc27144a4fe217))
* **CompaniesPage:** add post job functionality with dedicated panel and state management ([aa5f29e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/aa5f29e2a2241c91e24b7c5c4e7d6f4d91327de9))
* **company:** add logo upload functionality and enhance company data handling ([422268c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/422268c9bb8dcf7bcb72cb9634928a6350c3bc42))
* **DashboardPage, JobsPage, styles:** enhance button styles for job actions with new classes ([5b38dbc](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5b38dbccf87a1939c6735338295f3d5e1eadcdee))
* **DashboardPage, JobsPage, styles:** enhance button styles for job actions with new classes ([a9f5aaa](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a9f5aaa0bb3310c9b5ec9f86ac6ea710a4410584))
* **DashboardPage:** refactor job details handling with improved state management and UI updates ([245fb1f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/245fb1f43be197a8ab18742c60812ffc7d372647))
* **emailTemplates:** standardize quotes and improve job alert and login notification templates ([90bb821](https://github.com/kondjaboytjie/HumanResourceSystem/commit/90bb821609cd6f9d79805a01f7ac09c5b8f625bc))
* enable vertical scrolling on login page in mobile view ([c314f63](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c314f63fbf4ab1cb05143c2bbdf37f265b8c1375))
* enhance AppLayout with unread message badge and style adjustments ([8d175ee](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8d175ee9f7f039c2e30b280df393c726f1594352))
* enhance application statistics and job applications page with improved data handling and search functionality ([06cb102](https://github.com/kondjaboytjie/HumanResourceSystem/commit/06cb102a1ed51a446fb75392a2601d7af9cdf962))
* enhance audit logging with before and after snapshots for company, job, user, and role updates ([61aff96](https://github.com/kondjaboytjie/HumanResourceSystem/commit/61aff965a28ee763972178168180c32bbacfa3a7))
* enhance AuditPage with detailed before and after views for audit logs ([05bcb31](https://github.com/kondjaboytjie/HumanResourceSystem/commit/05bcb31251619314b8340268030fcb0e0186c2c6))
* enhance AuditPage with expandable details for audit logs ([9409939](https://github.com/kondjaboytjie/HumanResourceSystem/commit/9409939424c53f34f1ce388078fa6b0c920f5da3))
* enhance AuditPage with navigation and conditional filters for specific audit views ([3be8e97](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3be8e97b059ff211b6cb4e1bc2e678c00d174873))
* enhance authorization error messages with required roles and permissions; refactor role and permission checks in routes for improved clarity and maintainability ([db11fb3](https://github.com/kondjaboytjie/HumanResourceSystem/commit/db11fb311227e15c27d9130deed4cd4e134df358))
* enhance candidate profile display with additional personal and professional details ([f3c31ee](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f3c31ee576a0fe596b337e971f341d88e105757a))
* enhance CORS and security middleware to support dynamic origin parsing ([b5285b6](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b5285b61faed378fae2f13ed7b27bdf8490e97b7))
* enhance database configuration and add token refresh functionality ([8945802](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8945802676d84b870ffebb12fbb1cdf48cebb087))
* enhance database schema with industries table and update companies to use industry_id ([ffe3b86](https://github.com/kondjaboytjie/HumanResourceSystem/commit/ffe3b862a6db7917b6524ae9565dde149226c61a))
* enhance document collection logic to prioritize latest uploads and prevent duplicates ([df8aabf](https://github.com/kondjaboytjie/HumanResourceSystem/commit/df8aabf4a64e2fbe47011ff416aba3dd9dde6c00))
* enhance document collection logic to treat education records as active ([19de2a6](https://github.com/kondjaboytjie/HumanResourceSystem/commit/19de2a6bec0d44dc7fdc8b26f7b52e8c0317258c))
* enhance document download permissions and improve profile picture handling ([11a14c5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/11a14c5f190eb58f1794efd2855abcf92228dc8b))
* enhance document handling by resolving URLs and preventing duplicate attachments ([294f20b](https://github.com/kondjaboytjie/HumanResourceSystem/commit/294f20b209433741ce8bf280b186a443d00e928a))
* enhance document handling in profile collection, adding file name extraction from URLs ([c7396c9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c7396c92c2a85a2ddc35493958ffade63497aae9))
* enhance document routes with authorization checks for upload and management actions ([34defaf](https://github.com/kondjaboytjie/HumanResourceSystem/commit/34defaf5bb9aa67c0dacb7954cde04677ab61b1c))
* enhance email link handling with dynamic origin resolution ([3982cc4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3982cc4a6bca25d02096771809ba8267820e2907))
* enhance email sender functionality and improve UI components with footer and pagination adjustments ([7d67a99](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7d67a99e26773208d14a62667997397c274cd059))
* enhance email templates and notification links for improved user engagement ([6834ed1](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6834ed116ddf282f97f83c1946799d409f38c645))
* enhance fallback message to include direct file URL in UploadedDocumentCard ([472a649](https://github.com/kondjaboytjie/HumanResourceSystem/commit/472a649e29b67ecf0f9dc6f6083b40ced0d10e85))
* enhance form accessibility by adding required attributes and styling for required fields ([6ce1ea3](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6ce1ea3653fc528efebc9b7a18c138d99fe57e64))
* enhance handling of login welcome title and subtitle with camelCase support ([02e267e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/02e267e19babe9cc2c9a8d5534d09122a5f0f155))
* enhance job application process by validating profile completeness and handling errors ([45e3269](https://github.com/kondjaboytjie/HumanResourceSystem/commit/45e3269ea10b39b7711c441473c6501792650276))
* enhance job applications, profile, and jobs pages ([5c566f0](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5c566f004e88968800c2d7055f69d9a1aabe911e))
* enhance job creation and update processes with company and category resolution ([c6e4809](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c6e480909a1bdad4e3c173a23246916739523a95))
* enhance job validation and normalization for experience level and employment type ([0ed603f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0ed603f66b29df539fd968320208cfdf63753110))
* enhance JobSeekerProfilePage with directory statistics cards for improved user insights ([0ff1a10](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0ff1a10ec53e120d1c234b8add1be969c81aa9d2))
* enhance legacy document handling and re-upload messaging across application workflows ([5c424ee](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5c424ee0f04018f38f6533c52dadcd3386d96f5b))
* enhance legacy document handling in profile page with clearer messaging for re-upload requirements ([8c72e7e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8c72e7ebd11ad837d8db018a3914ae76f092b48a))
* enhance legacy document retrieval logic to prioritize primary documents for job seekers ([ab0570d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/ab0570d1906cd15b2f1ec11c809650c57bfff3ff))
* enhance loading state handling for resumes in job applications page ([5fdff7e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5fdff7e6350134153f92060b4ef643202b228f7f))
* enhance login page functionality and styling for improved user experience ([5e6fd58](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5e6fd5844c15a1c86fe7bd3d70f1d6a1e8c4a054))
* enhance login page layout for better responsiveness and accessibility ([df4aa85](https://github.com/kondjaboytjie/HumanResourceSystem/commit/df4aa856305bbdd7aa5bff8542f9e23e734736d1))
* enhance login welcome content and add interview scheduling features ([0ff3ff4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0ff3ff4b81a646502475e41f5f53f8bcabdc9597))
* enhance MyPermissionsPage with action inference and improved role display ([79a8da9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/79a8da92b05a3cacb86a966ada62b64684aaf877))
* enhance pagination components for improved accessibility and styling ([a4e77fb](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a4e77fb2c16f5d0b0f9b1f2b9a9a1ce14973a183))
* enhance permission checks for app color changes and update UI messaging ([613625b](https://github.com/kondjaboytjie/HumanResourceSystem/commit/613625baed9d0775a605a4464517660d659b8a5b))
* enhance PlaceholderPage with spinner component and styling for loading state ([949c361](https://github.com/kondjaboytjie/HumanResourceSystem/commit/949c361c3e46a865d2702c4d1520292259ea60de))
* enhance profile picture upload handling and improve error responses ([4a8730f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/4a8730f1036f30ecae54aa0e53186f23916876ac))
* enhance public jobs page layout and styling for better responsiveness and organization ([d29c034](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d29c03437c2d46863b284ff1bf1d33a59adb4e9b))
* enhance public jobs pagination layout for better responsiveness ([8e01eb5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8e01eb50a699e634f1bd18d316a533ab7f287778))
* enhance roles table responsiveness and improve app color controls layout ([8a705b8](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8a705b847c2a4719893251a2527e41786319643d))
* enhance security middleware with cross-origin resource policy; update job routes to exclude expired jobs; improve RichTextEditor with link insertion modal and toolbar icons; refine CSS for responsive grid and rich text components ([7660d5c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7660d5ce4cf4567f2c8b0e397e1459caabfb1e38))
* enhance setup status handling and improve MainCompanySetupPage layout ([fb7a2e7](https://github.com/kondjaboytjie/HumanResourceSystem/commit/fb7a2e776148b1f1feddbf8087ca28ffddc86d21))
* enhance sidebar layout with sticky positioning and improved overflow handling ([0b9c73e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0b9c73e8208c53f680803d4e029c86224a6233a2))
* enhance signup page responsiveness and improve confirm value styling ([3e7fdfa](https://github.com/kondjaboytjie/HumanResourceSystem/commit/3e7fdfafb54ed5ae812262a6de6e54fdbeb42e4b))
* enhance system settings and permissions management ([82ef791](https://github.com/kondjaboytjie/HumanResourceSystem/commit/82ef79129df510924f807b31200ad8bf0b30d1f7))
* Enhance system settings with application status notifications and branding info ([8e8d903](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8e8d90394a445ccba560bd66ed083d4e03ebfd83))
* enhance user activation flow with improved feedback and self-healing for email verification ([540e588](https://github.com/kondjaboytjie/HumanResourceSystem/commit/540e588a9258cf52ff7243c85d7917b883276f51))
* enhance user greeting display and style adjustments for improved UI; update job application permission logic ([19d928e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/19d928e8e2e1d74c433eab7a30d9d8958f098c09))
* enhance user search permissions and improve company user management checks ([55f409a](https://github.com/kondjaboytjie/HumanResourceSystem/commit/55f409a5225357cccecaa647adb1eed74aa69e0d))
* enhance visitor analytics with grouping options and update dashboard to display trends ([f453d09](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f453d09d0d4b02e9ec8a3322a216e0a271a3901a))
* **GlobalSettingsPage, CompanyController, systemSettings.service:** add application status notifications handling and UI controls ([910b2dd](https://github.com/kondjaboytjie/HumanResourceSystem/commit/910b2dd3a8995fed83b1079884b1f9ca9a8484c4))
* **GlobalSettingsPage:** add main company selection and update system settings handling ([7b0941f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7b0941fd02cd2a33ddd173d5ef52b187812e7aed))
* **GlobalSettingsPage:** enhance UI structure and improve application status notifications description ([00dd01e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/00dd01e9fa2e20bbcdf8997f78aac36ab0a65597))
* implement account activation flow with email verification; enhance login and signup processes with captcha and token handling ([e744808](https://github.com/kondjaboytjie/HumanResourceSystem/commit/e744808a7a41fa5b4e7f17a2a297b78a088e12df))
* implement account activation flow with token handling and UI updates ([36cf7b4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/36cf7b453e499b7d0b4e1ad94054ee8adacfff7b))
* implement account update functionality with email and phone number validation ([f164b10](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f164b1055d7d919acd04a0bb7b7c12d57b13f0aa))
* implement app color customization and enhance global settings management ([36697ab](https://github.com/kondjaboytjie/HumanResourceSystem/commit/36697ab298606c87d95a771b841919d5558739fa))
* implement applicant readiness check for job applications and enhance document collection ([671a7a5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/671a7a5e754a25fb5c209b769bdd5a2267d78ff9))
* implement centralized CRUD audit logging and enhance audit log querying ([f759dae](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f759dae47e98110c7a52a69fe291502e1dba0ddd))
* implement detailed authentication error messages and add footer to LoginPage ([fab6f23](https://github.com/kondjaboytjie/HumanResourceSystem/commit/fab6f235a532dbec259e8a98035cbc681abd0065))
* implement document download functionality and enhance document URL handling ([01d0e15](https://github.com/kondjaboytjie/HumanResourceSystem/commit/01d0e15b503197ceb971b14f54df1f04524a6877))
* implement document prefetching for improved loading performance in job seeker profiles ([18471dd](https://github.com/kondjaboytjie/HumanResourceSystem/commit/18471ddc4494b3fae61a1959030524f27b14409f))
* implement document URL resolution and enhance document preview handling ([6fbe160](https://github.com/kondjaboytjie/HumanResourceSystem/commit/6fbe160ff55770cbdeb79dd25592a28fccb2dbea))
* implement dynamic pagination size options and add back-to-top button in PublicJobsPage ([550c16f](https://github.com/kondjaboytjie/HumanResourceSystem/commit/550c16f115072dabfca904e1dbdf3de2f104b863))
* implement email masking for password reset functionality and add email template for password reset ([5c1943b](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5c1943b08183450eed49d380e9d0c40bc0ef7b9e))
* implement external document preview functionality in job applications page ([79633d4](https://github.com/kondjaboytjie/HumanResourceSystem/commit/79633d408b3990bf01f7ac5ce075701eee19fc31))
* implement job seeker directory with listing and pagination ([0c09bfe](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0c09bfe5cf93ce8f6b4959bb9e89ef3201998852))
* implement main company setup functionality and validation ([8a818e5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8a818e5ed81617b7ad758df7f8a9b5224ce204d1))
* implement no-scroll behavior for login page and enhance styling for better responsiveness ([498cc27](https://github.com/kondjaboytjie/HumanResourceSystem/commit/498cc272ab1c5d44c444fd3e763f8a71c1e0636b))
* implement pagination size options across multiple pages ([ecbcdfd](https://github.com/kondjaboytjie/HumanResourceSystem/commit/ecbcdfda84371aa96c82a6360fd504c611936a6b))
* implement permission checks for viewing resumes and enhance validation logic ([7af66b6](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7af66b627a300e3b0bb53963d137fda403a53e63))
* implement profile picture upload and retrieval functionality; update user schema to store profile pictures ([7c579c0](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7c579c0d2ea26cac9b556b17dd5d976ba242c84a))
* implement storage usage calculation for uploads and database ([ad0fe93](https://github.com/kondjaboytjie/HumanResourceSystem/commit/ad0fe93473c0474a37b5d26da1ce70b37cb27f26))
* implement user activation flow with email notifications and password setup ([f614eb1](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f614eb150fc86bb6e4f1949dc63350a00f6fedfb))
* improve job details toggle button visibility and styling ([e29a4ed](https://github.com/kondjaboytjie/HumanResourceSystem/commit/e29a4ed1e74d77075fcce16e8607873ed8c804dd))
* improve layout and styling of JobSeekerProfilePage status and pagination components ([10b5948](https://github.com/kondjaboytjie/HumanResourceSystem/commit/10b5948335dfdd3d059e5fd72ca53db07362e15f))
* improve loading state handling by checking for user ID in resumes data ([8155e4e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8155e4ea59db4cbe4735e547e0dc951598e48514))
* improve loading state handling for job application profiles, documents, and resumes ([b371ab6](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b371ab6291fb01646886d5e730ed6bb0ba2429eb))
* improve pagination logic for seeker jobs and applications ([d3f93b5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d3f93b58d55783557c3e8a83ef5e5bce529a3bcd))
* increase commit header length limit to 500 characters ([47f6864](https://github.com/kondjaboytjie/HumanResourceSystem/commit/47f68647fca13b32d3ab786eaf45de2b658dbe94))
* **Jobs, CompaniesPage, PublicJobsPage:** enhance job and company data handling with logo support and improved company name resolution ([a8d246d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a8d246d5cfcdda0c87c55cc657a6e7214465759b))
* **LoginPage, AppLayout:** implement dynamic system name loading and update branding references ([26396b3](https://github.com/kondjaboytjie/HumanResourceSystem/commit/26396b32788490a7860004d6688fff012ea0d86c))
* normalize application status handling with improved validation and mapping ([c079f3a](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c079f3a7d26de0923d73e66ec360afe90bbc270a))
* normalize role options in user filter dropdown to uppercase ([8067b71](https://github.com/kondjaboytjie/HumanResourceSystem/commit/8067b71dbcbafb47d2602fcc2f88582ba7f96a3d))
* refactor document upload handling to use memory storage and improve file name generation ([74365a1](https://github.com/kondjaboytjie/HumanResourceSystem/commit/74365a11c7ace2b5b41c92ef90a44d7826044ae0))
* refactor setup-status route to improve query handling and variable naming ([a49f1f5](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a49f1f591c90e51c5be1c1b4c7f2cc3e0c086f5a))
* refactor user display in AppLayout and enhance styling for improved usability ([17da937](https://github.com/kondjaboytjie/HumanResourceSystem/commit/17da93756f58c79680f7244e7a8c070e1e3a68fb))
* refine document retrieval logic to prioritize latest associated documents for job seekers ([adc644e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/adc644eeb2993ea7369b8bd4b5bdefb8057a30d1))
* refine pagination layout and search visibility for job seekers ([15d8912](https://github.com/kondjaboytjie/HumanResourceSystem/commit/15d8912f7f84cc154406204175eed0c3ddd7d35c))
* refine permission checks and enhance layout in Dashboard and MyPermissions pages ([b8b3d6a](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b8b3d6a80bf05d2e1716515c7a7ff4366a6700ee))
* remove legacy document checks from job application process in profile page ([f268f28](https://github.com/kondjaboytjie/HumanResourceSystem/commit/f268f28b0214cae1c1010cc646a7f3d5d4f424df))
* remove legacy document re-upload checks from application flow and update resume handling in profile page ([01e94d9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/01e94d9367cdd864e5ac0265463b8e825df31a48))
* remove legacy uploads reference and enhance resume handling in JobSeekerProfilePage ([5b3f5cd](https://github.com/kondjaboytjie/HumanResourceSystem/commit/5b3f5cd44bfb998581ae2e55a880c86a13c3ec2b))
* **server:** add screening service and related backend updates ([47a09f9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/47a09f934501c8187bfb589cd8d363adcbc6c1a9))
* simplify pagination component structure for improved readability ([b4b65fd](https://github.com/kondjaboytjie/HumanResourceSystem/commit/b4b65fd49d01eb6ca529f5697d12d49e9c30cc8e))
* simplify platform overview by removing filters and updating dashboard display ([393986b](https://github.com/kondjaboytjie/HumanResourceSystem/commit/393986bc35aa775072b90727e903177a74577b30))
* simplify profile picture upload logic and improve state management ([491d9b6](https://github.com/kondjaboytjie/HumanResourceSystem/commit/491d9b67b71c7fdce073252e04bc5f23d0f0b7c5))
* **styles:** enhance button and icon styles for improved accessibility and usability ([28b9e77](https://github.com/kondjaboytjie/HumanResourceSystem/commit/28b9e7709668f93f9c798ccd8f5af0b7b91b7518))
* **styles:** enhance navigation layout with grid adjustments for better alignment ([bdc15b8](https://github.com/kondjaboytjie/HumanResourceSystem/commit/bdc15b8f2518f3e124e4f5f85c69cad8a9a26ee3))
* **styles:** enhance sidebar collapsed layout with improved header and brand styling ([da7b78c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/da7b78cf72b050f828adb5834e3e3106ecbda1f0))
* **styles:** enhance table row styling with color-mix variables for improved readability ([dcce2ae](https://github.com/kondjaboytjie/HumanResourceSystem/commit/dcce2ae84141125fa64e121e9f6781e46e89c7be))
* **systemSettings:** implement dynamic settings file resolution and improve error handling in GlobalSettingsPage ([c05384e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/c05384ed00376aaaa295b229e596486fcd7b0973))
* **systemSettings:** update system name to "Hito HR Consultant" in settings file ([7dbdec2](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7dbdec29d5500f22f3312aaa45bc999aba58280e))
* **theme:** implement theme toggle functionality on LoginPage with persistent storage ([57f26ba](https://github.com/kondjaboytjie/HumanResourceSystem/commit/57f26bab0044d041a5e3a5688f879966f3db0827))
* **theme:** implement theme toggle functionality with light/dark mode support ([7892c33](https://github.com/kondjaboytjie/HumanResourceSystem/commit/7892c330dddf001d3f99d5d7e51f6f6d6f83ced8))
* update app color in system settings to enhance branding consistency ([57ead62](https://github.com/kondjaboytjie/HumanResourceSystem/commit/57ead62cf202f7e0524e64c2fb7fa84fef5b1e06))
* update app color scheme and enhance color blending functions for improved UI consistency ([9a8efe9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/9a8efe98e69693efb05a57fd059a572cf7422261))
* update app color to [#0055](https://github.com/kondjaboytjie/HumanResourceSystem/issues/0055)ff and enhance button styles for consistency ([81a3b1c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/81a3b1ce1bd2e2829c137364d5df2ab9d5a611b8)), closes [#0055ff](https://github.com/kondjaboytjie/HumanResourceSystem/issues/0055ff)
* update app color to [#2](https://github.com/kondjaboytjie/HumanResourceSystem/issues/2)c2e83 and apply theme color in Login and Signup pages ([2e2140d](https://github.com/kondjaboytjie/HumanResourceSystem/commit/2e2140de41105fb5421a18931bed39af25abc8a0)), closes [#2c2e83](https://github.com/kondjaboytjie/HumanResourceSystem/issues/2c2e83)
* update app color to [#6](https://github.com/kondjaboytjie/HumanResourceSystem/issues/6)b7280 and adjust related components for consistency ([1c22a9c](https://github.com/kondjaboytjie/HumanResourceSystem/commit/1c22a9cbf702d714c3b5cb490f1c79cadc23250f)), closes [#6b7280](https://github.com/kondjaboytjie/HumanResourceSystem/issues/6b7280)
* update application status permission and related documentation for consistency ([4ae3d84](https://github.com/kondjaboytjie/HumanResourceSystem/commit/4ae3d84c364569aeef71b6d44694f06a8f1bdc34))
* update auth page footer styling for improved layout ([fc9d691](https://github.com/kondjaboytjie/HumanResourceSystem/commit/fc9d6914075424c3fbcaf95ca64af85b04145fa3))
* update branding logo handling and improve document preview functionality across multiple pages ([059fd31](https://github.com/kondjaboytjie/HumanResourceSystem/commit/059fd3158bc798e02283389115d8446e77ae12b2))
* update company ID in system settings and enhance job seeker profile with company name resolution ([363061e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/363061e0bc50fcd530bd353227c4e5b2941d38a3))
* update footer content with new copyright information and remove dynamic year display ([a4e22e2](https://github.com/kondjaboytjie/HumanResourceSystem/commit/a4e22e263912d05e848784e59c9cd94fa6ee4c14))
* update form labels to remove asterisk for required fields and adjust default app color ([94247c2](https://github.com/kondjaboytjie/HumanResourceSystem/commit/94247c251f1ba144ad82282af6f0875161b161df))
* update getBrandingInfo query to include logo_data check for has_logo ([e2f6966](https://github.com/kondjaboytjie/HumanResourceSystem/commit/e2f696685674a6fc74c95d38b45ee5ef971c7a3c))
* update job application status permissions and add legacy compatibility for existing roles ([89fba63](https://github.com/kondjaboytjie/HumanResourceSystem/commit/89fba634351c2e9b374c6ad794d942558236502e))
* update job seeker profile management ([d6d24df](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d6d24df7849cc8df85a4246e25e6b1d5e9385da2))
* update login page to remove default welcome title and subtitle, enhancing dynamic content display ([2fc69c9](https://github.com/kondjaboytjie/HumanResourceSystem/commit/2fc69c9658d2cfaba2f48ec98e417544d33dacb0))
* update login welcome messages and enhance error handling for API connectivity ([9379467](https://github.com/kondjaboytjie/HumanResourceSystem/commit/9379467a888648ed31abd2ea9f078c4c82ff85ce))
* update pagination limits for admin users and roles to improve performance ([d7458aa](https://github.com/kondjaboytjie/HumanResourceSystem/commit/d7458aa308d78aaa4fa4c3d1e636eec37c559c6a))
* update pagination rendering logic and improve button styling in job pages ([108438e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/108438ed73ddd2af3e61249cffc1a2cbe1e41fb3))
* update permission label for consistency and enhance JobApplicationsPage layout with applicant header ([9dcc113](https://github.com/kondjaboytjie/HumanResourceSystem/commit/9dcc113588864b548a9e48dbd1f3eec3051a90a2))
* update PlaceholderPage message and add setup completion polling in MainCompanySetupPage ([8061739](https://github.com/kondjaboytjie/HumanResourceSystem/commit/806173976786490bc9263a9d52e73dd9ec71fb72))
* update profile completeness modals across pages for consistency and clarity ([0b3465a](https://github.com/kondjaboytjie/HumanResourceSystem/commit/0b3465ac872642280e3a89c651d508f7f5772a75))
* update status representation with structured objects and enhance styling for better display ([699fd72](https://github.com/kondjaboytjie/HumanResourceSystem/commit/699fd7219ae189203f8fff712e675bb36f339b50))
* update visitor analytics queries to count unique visitors by IP address ([89dda3e](https://github.com/kondjaboytjie/HumanResourceSystem/commit/89dda3e5eb76baa7118e7caa76ee8bf2be4a62d6))
