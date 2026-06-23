# Node Naming Reference (purpose-based, all unique across the workflow)

Every sheet-read is named for the JOB it does in its flow. No numbers.
Paste the matching code into the node with the EXACT name shown.

## SEED flow  (builds the day's GenQueue)
| Node name            | Type   | Reads / does                          |
|----------------------|--------|---------------------------------------|
| (trigger)            | Cron   | 45 3 * * 1-5                          |
| Skews to Queue       | Sheets | read SkewConfig                       |
| Subscribers to Queue | Sheets | read Subscribers                      |
| Gen Seed Queue       | Code   | gen-seed-queue-code.js                |
| Input Seed Values    | Sheets | append → GenQueue                     |

## GENERATOR flow  (makes one digest per run)
| Node name            | Type   | Reads / does                          |
|----------------------|--------|---------------------------------------|
| (trigger)            | Cron   | */3 4 * * 1-5                         |
| Read GenQueue        | Sheets | read GenQueue                         |
| Skew for Prompt      | Sheets | read SkewConfig                       |
| Next Variant Digest  | Code   | generate-get-next-variant.js          |
| If                   | IF     | {{ $json._done }} true→stop           |
| Mark Generating      | Sheets | appendOrUpdate GenQueue, match rowKey |
| Editorial for Prompt | Sheets | read PromptConfig (key=editorial)     |
| Assemble Prompt      | Code   | assemble-prompt-code.js               |
| Generate Digest via Gemini | HTTP | gemini body = requestBody expr      |
| Parse & Validate Digest | Code | parse-digest-code.js                  |
| Validate & Fix Story Links | Code | validate-links-code.js             |
| Plagiarism Check     | Code   | plagiarism-check-code.js              |
| ReWrite Agent        | Code   | rewrite-agent-code.js                 |
| Build HTML Email     | Code   | build-email-code.js                   |
| Save Digest to Sheet | Sheets | append → Digest (maps rowKey)         |
| Mark Generated       | Sheets | appendOrUpdate GenQueue, match rowKey |
| Log Generation       | Code   | generation-log-code.js                |
| Log Entry            | Sheets | append → GenerationLog                |

## RESET flow  (clears send flags)
| Node name            | Type   | Reads / does                          |
|----------------------|--------|---------------------------------------|
| (trigger)            | Cron   | evening, e.g. 0 23 * * 0-4            |
| Digests to Reset     | Sheets | read Digest                           |
| Reset Flags          | Code   | reset-daily-flags-code.js             |
| Update Digest Rows   | Sheets | appendOrUpdate Digest, match rowKey   |

## SEND flow  (sends one variant's chunk per run)
| Node name            | Type   | Reads / does                          |
|----------------------|--------|---------------------------------------|
| (trigger)            | Cron   | */5 5-6 * * 1-5                       |
| Read Partners        | Sheets | read Partners                         |
| Read LoanOfficers    | Sheets | read LoanOfficers                     |
| Subscribers to Send  | Sheets | read Subscribers                      |
| Digests to Send      | Sheets | read Digest                           |
| Next Variant Group   | Code   | send-get-next-variant.js              |
| If1                  | IF     | {{ $json._done }} true→stop           |
| Mark Group as Sending| Sheets | appendOrUpdate Digest, match rowKey, sendStatus=sending |
| Send Batch by Variant| Code   | send-batch-by-variant-code.js         |
| Split Subscribers    | Split  | batch loop                            |
| Send via Gmail       | Gmail  | to/subject/html from $json            |
| Log Send to Sheet    | Sheets | appendOrUpdate Subscribers, match email |
| 1sec Send Pause      | Wait   | 1s                                    |
| If2                  | IF     | _moreRemain false → Mark Complete     |
| Mark Group as Complete| Sheets| appendOrUpdate Digest, match rowKey, sendStatus=complete |

## RENAMES YOU NEED TO DO (drop numbers, use purpose names)
- Read SkewConfig1   → Skews to Queue        (seed flow)
- Read Subscribers1  → Subscribers to Queue  (seed flow)
- Read SkewConfig    → Skew for Prompt       (generator flow)
- Read PromptConfig  → Editorial for Prompt  (generator flow)
- Fetch Today's Digests  → Digests to Reset  (reset flow)
- Fetch Today's Digests1 → Digests to Send   (send flow)
- Fetch Active Subscribers → Subscribers to Send (send flow)
