"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

const CATEGORIES = [
  "Food & Dining",
  "Restaurants",
  "Groceries",
  "Transportation",
  "Fuel",
  "Public Transit",
  "Entertainment",
  "Streaming",
  "Subscriptions",
  "Health",
  "Pharmacy",
  "Education",
  "Clothing",
  "Home",
  "Investments",
  "Other",
];

interface TransactionTableProps {
  transactions: Transaction[];
  onCategoryChange: (id: string, category: string) => void;
}

export function TransactionTable({
  transactions,
  onCategoryChange,
}: TransactionTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right font-mono">Valor</TableHead>
          <TableHead>Categoria</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="font-mono text-muted-foreground">
              {formatDate(tx.date)}
            </TableCell>
            <TableCell>{tx.description}</TableCell>
            <TableCell
              className={cn(
                "text-right font-mono",
                tx.amount >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {formatCurrency(tx.amount)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 font-normal"
                  >
                    <Badge variant="secondary" className="font-normal">
                      {tx.category || "Outro"}
                    </Badge>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem
                      key={cat}
                      onClick={() => onCategoryChange(tx.id, cat)}
                    >
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
