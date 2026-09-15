import React, { useState, useEffect } from 'react'
import {
  Download, Plus, Play, CheckCircle, AlertTriangle, Settings,
  Layers, Trash2, Users, ArrowUp, ArrowDown, Tag, Calculator,
  Package, Wrench, ListChecks, ClipboardList, ChevronRight
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

type PlannerTab = 'details' | 'bom' | 'routing' | 'machineworks'

const TABS = [
  { id: 'details' as PlannerTab,      label: 'Job Details',          icon: <ClipboardList size={14}/> },
  { id: 'bom' as PlannerTab,          label: 'Bill of Materials',    icon: <Package size={14}/> },
  { id: 'routing' as PlannerTab,      label: 'Operations & Routing', icon: <Layers size={14}/> },
  { id: 'machineworks' as PlannerTab, label: 'Machine Works',        icon: <Wrench size={14}/> },
]
