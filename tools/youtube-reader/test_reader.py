import unittest
from reader import normalize, caption_lines, choose_track


class ReaderTest(unittest.TestCase):
    def test_urls(self):
        for url in ['https://youtu.be/b-8DpsYLI7Y', 'https://www.youtube.com/shorts/b-8DpsYLI7Y', 'https://www.youtube.com/watch?v=b-8DpsYLI7Y&list=example']:
            self.assertEqual(normalize(url), 'https://www.youtube.com/watch?v=b-8DpsYLI7Y')
        for url in ['http://youtube.com/watch?v=b-8DpsYLI7Y', 'https://youtube.com.evil.test/watch?v=b-8DpsYLI7Y', 'https://youtube.com/@toothfairy_pf', 'https://x@youtube.com/watch?v=b-8DpsYLI7Y']:
            with self.assertRaises(ValueError): normalize(url)

    def test_captions(self):
        data={'events':[{'tStartMs':1200,'segs':[{'utf8':'Hello '},{'utf8':'world'}]},{'tStartMs':1500,'segs':[{'utf8':'Hello world'}]},{'tStartMs':2000,'segs':[{'utf8':'world again'}]}]}
        self.assertEqual(caption_lines(data),[{'start':1.2,'text':'Hello world'},{'start':2.0,'text':'world again'}])

    def test_manual_and_no_silent_translation(self):
        self.assertEqual(choose_track({'subtitles':{'ko':[{'ext':'json3','url':'https://www.youtube.com/api/timedtext?v=x'}]},'automatic_captions':{'ja':[{'ext':'json3','url':'auto'}]}})[0:2],('ko',False))
        self.assertIsNone(choose_track({'automatic_captions':{'ja':[{'ext':'json3','url':'https://www.youtube.com/api/timedtext?tlang=ja'}]}}))


if __name__ == '__main__': unittest.main()
