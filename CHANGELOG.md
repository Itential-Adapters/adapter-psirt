
## 1.0.10 [08-31-2026]

* Changes made at 2026.08.31_11:22AM

See merge request itentialopensource/adapters/adapter-psirt!53

---

## 1.0.9 [08-03-2026]

* Changes made at 2026.08.03_10:39AM

See merge request itentialopensource/adapters/adapter-psirt!52

---

## 1.0.8 [07-27-2026]

* Changes made at 2026.07.27_10:38AM

See merge request itentialopensource/adapters/adapter-psirt!51

---

## 1.0.7 [07-22-2026]

* Changes made at 2026.07.22_09:38AM

See merge request itentialopensource/adapters/adapter-psirt!50

---

## 1.0.6 [07-11-2026]

* Changes made at 2026.07.11_17:15PM

See merge request itentialopensource/adapters/adapter-psirt!49

---

## 1.0.5 [07-01-2026]

* Changes made at 2026.07.01_15:01PM

See merge request itentialopensource/adapters/adapter-psirt!48

---

## 1.0.4 [06-16-2026]

* Changes made at 2026.06.16_12:20PM

See merge request itentialopensource/adapters/adapter-psirt!46

---

## 1.0.3 [05-19-2026]

* Changes made at 2026.05.19_09:50AM

See merge request itentialopensource/adapters/adapter-psirt!45

---

## 1.0.2 [05-13-2026]

* Changes made at 2026.05.13_09:14AM

See merge request itentialopensource/adapters/adapter-psirt!44

---

## 1.0.1 [04-28-2026]

* Changes made at 2026.04.28_13:58PM

See merge request itentialopensource/adapters/adapter-psirt!43

---

## 1.0.0 [04-13-2026]

* Security Fixes Requiring Node >= 20.19.x made at 2026.04.13_09:22AM

See merge request itentialopensource/adapters/adapter-psirt!42

---

## 0.10.4 [03-23-2026]

* Changes made at 2026.03.23_12:29PM

See merge request itentialopensource/adapters/adapter-psirt!41

---

## 0.10.3 [03-04-2026]

* Changes made at 2026.03.04_09:49AM

See merge request itentialopensource/adapters/adapter-psirt!40

---

## 0.10.2 [02-23-2026]

* Changes made at 2026.02.22_16:32PM

See merge request itentialopensource/adapters/adapter-psirt!39

---

## 0.10.1 [02-17-2026]

* Changes made at 2026.02.16_19:26PM

See merge request itentialopensource/adapters/adapter-psirt!38

---

## 0.10.0 [02-13-2026]

* minor/auto-migrate/20260213-114023

See merge request itentialopensource/adapters/adapter-psirt!36

---

## 0.5.4 [10-15-2024]

* Changes made at 2024.10.14_21:18PM

See merge request itentialopensource/adapters/adapter-psirt!19

---

## 0.5.3 [09-14-2024]

* add workshop and fix vulnerabilities

See merge request itentialopensource/adapters/adapter-psirt!17

---

## 0.5.2 [08-14-2024]

* Changes made at 2024.08.14_19:34PM

See merge request itentialopensource/adapters/adapter-psirt!16

---

## 0.5.1 [08-07-2024]

* Changes made at 2024.08.06_21:37PM

See merge request itentialopensource/adapters/adapter-psirt!15

---

## 0.5.0 [05-16-2024]

* 2024 Adapter Migration

See merge request itentialopensource/adapters/security/adapter-psirt!14

---

## 0.4.5 [03-27-2024]

* Changes made at 2024.03.27_13:52PM

See merge request itentialopensource/adapters/security/adapter-psirt!13

---

## 0.4.4 [03-13-2024]

* Changes made at 2024.03.13_11:10AM

See merge request itentialopensource/adapters/security/adapter-psirt!12

---

## 0.4.3 [03-11-2024]

* Changes made at 2024.03.11_16:20PM

See merge request itentialopensource/adapters/security/adapter-psirt!10

---

## 0.4.2 [02-27-2024]

* Changes made at 2024.02.27_11:56AM

See merge request itentialopensource/adapters/security/adapter-psirt!9

---

## 0.4.1 [12-31-2023]

* update metadata

See merge request itentialopensource/adapters/security/adapter-psirt!8

---

## 0.4.0 [12-20-2023]

* Adapter Engine has been updated and the changes are being migrated to the adapter

See merge request itentialopensource/adapters/security/adapter-psirt!7

---

## 0.3.0 [05-29-2022]

* Migration to the latest Adapter Foundation

See merge request itentialopensource/adapters/security/adapter-psirt!5

---

## 0.2.3 [03-04-2021]

- Migration to bring up to the latest foundation
  - Change to .eslintignore (adapter_modification directory)
  - Change to README.md (new properties, new scripts, new processes)
  - Changes to adapterBase.js (new methods)
  - Changes to package.json (new scripts, dependencies)
  - Changes to propertiesSchema.json (new properties and changes to existing)
  - Changes to the Unit test
  - Adding several test files, utils files and .generic entity
  - Fix order of scripts and dependencies in package.json
  - Fix order of properties in propertiesSchema.json
  - Update sampleProperties, unit and integration tests to have all new properties.
  - Add all new calls to adapter.js and pronghorn.json
  - Add suspend piece to older methods

See merge request itentialopensource/adapters/security/adapter-psirt!4

---

## 0.2.2 [07-09-2020]

- Update the adapter to the latest foundation

See merge request itentialopensource/adapters/security/adapter-psirt!3

---

## 0.2.1 [01-14-2020]

- Update the adapter to the latest foundation

See merge request itentialopensource/adapters/security/adapter-psirt!2

---

## 0.2.0 [11-08-2019]

- Update the adapter to the latest adapter foundation.
  - Updating to adapter-utils 4.24.3 (automatic)
  - Add sample token schemas (manual)
  - Adding placement property to getToken response schema (manual - before encrypt)
  - Adding sso default into action.json for getToken (manual - before response object)
  - Add new adapter properties for metrics & mock (save_metric, mongo and return_raw) (automatic - check place manual before stub)
  - Update sample properties to include new properties (manual)
  - Update integration test for raw mockdata (automatic)
  - Update test properties (manual)
  - Changes to artifactize (automatic)
  - Update type in sampleProperties so it is correct for the adapter (manual)
  - Update the readme (automatic)

See merge request itentialopensource/adapters/security/adapter-psirt!1

---

## 0.1.1 [11-04-2019]

_ Initial Commit_

See commit 9e8152e

---
