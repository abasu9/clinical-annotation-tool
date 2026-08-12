# Annotator login credentials (pilot)

Use your **Login ID** + **PIN** to sign in. After login, choose Annotation or Rating.

Blind codes (`nf`, `c`, `sz`, `s`, `w`) are display-only and **cannot** be used to log in.

| Login ID | PIN | Blind code (display only) |
|----------|-----|---------------------------|
| `dr naafila` | `194827` | nf |
| `dr aditya` | `385601` | c |
| `Dr Sanchez` | `572913` | sz |
| `Dr Saja` | `640158` | s |
| `Dr Wesley` | `819374` | w |

## Notes

- Share each PIN **only** with that annotator (do not post the full table in a group chat).
- Login IDs are case-sensitive where stored in the database (`Dr Sanchez`, `Dr Saja`, `Dr Wesley`).
- To change PINs, set `VITE_IAA_PINS` in `.env`, e.g.  
  `VITE_IAA_PINS=nf:194827,c:385601,sz:572913,s:640158,w:819374`  
  then restart / redeploy.
