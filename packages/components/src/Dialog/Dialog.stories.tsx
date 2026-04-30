import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './index'
import { Button } from '../Button'
import './Dialog.css'

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

const DialogExample = ({ title, description, content }: { title: string; description?: string; content: string }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader title={title} description={description} />
        <DialogContent>
          <p>{content}</p>
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

export const Default: Story = {
  render: () => (
    <DialogExample
      title="Welcome"
      description="This is a dialog component"
      content="Dialog content goes here. You can put any React components inside."
    />
  ),
}

export const WithoutDescription: Story = {
  render: () => (
    <DialogExample
      title="Simple Dialog"
      content="This dialog has no description, just a title and content."
    />
  ),
}

export const ConfirmAction: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setOpen(true)}>Delete Item</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogHeader 
            title="Confirm Deletion" 
            description="This action cannot be undone"
          />
          <DialogContent>
            <p>Are you sure you want to delete this item? All associated data will be permanently removed.</p>
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => { console.log('Deleted'); setOpen(false) }}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </Dialog>
      </>
    )
  },
}

export const WithForm: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setOpen(true)}>Create New Item</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogHeader 
            title="Create Item" 
            description="Enter the details for your new item"
          />
          <form onSubmit={(e) => { e.preventDefault(); console.log('Submitted'); setOpen(false) }}>
            <DialogContent>
              <div className="field">
                <label>Name</label>
                <input type="text" placeholder="Enter name" />
              </div>
              <div className="field">
                <label>Description</label>
                <input type="text" placeholder="Enter description" />
              </div>
            </DialogContent>
            <DialogFooter>
              <Button type="submit">Create</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </>
    )
  },
}
