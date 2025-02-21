import unittest
from unittest.mock import Mock, patch
import json
from src.message_processor import MessageProcessor
from src.reply_bot import ReplyBot
from src.message_handler import MessageHandler

class TestMessageProcessing(unittest.TestCase):
    def setUp(self):
        self.message_processor = MessageProcessor()
        self.reply_bot = ReplyBot()
        self.message_handler = MessageHandler()

    def test_message_flow(self):
        test_message = {
            "type": "message",
            "content": "Hello bot",
            "user_id": "test_user",
            "timestamp": "2024-03-20T10:00:00Z"
        }
        
        result = self.message_processor.process(test_message)
        self.assertIsNotNone(result)
        self.assertTrue(isinstance(result, dict))
        
    def test_reply_bot_trigger(self):
        test_message = {
            "content": "!help",
            "user_id": "test_user"
        }
        
        response = self.reply_bot.handle_command(test_message)
        self.assertIsNotNone(response)
        self.assertTrue("help" in response.lower())

    def test_invalid_message_handling(self):
        invalid_message = {}
        with self.assertRaises(ValueError):
            self.message_processor.process(invalid_message)

    @patch('src.message_handler.MessageHandler.send_message')
    def test_message_handler_send(self, mock_send):
        mock_send.return_value = True
        
        result = self.message_handler.send_message("test message", "test_channel")
        self.assertTrue(result)
        mock_send.assert_called_once_with("test message", "test_channel") 