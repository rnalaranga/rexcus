import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'w', 'utf-8') as f:
    f.write(content)